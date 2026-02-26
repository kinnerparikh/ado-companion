import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookmarkManager } from "@/bookmarks/bookmark-manager";
import type { CachedPR } from "@/storage/types";

const makePR = (id: number, url: string): CachedPR => ({
  id,
  title: `PR ${id}`,
  projectName: "ProjectA",
  repositoryName: "repo",
  url,
  createdDate: "2025-02-25T10:00:00Z",
  lastUpdated: "2025-02-26T10:00:00Z",
});

describe("BookmarkManager", () => {
  let manager: BookmarkManager;

  beforeEach(() => {
    manager = new BookmarkManager();

    // Clear all mock call counts from previous tests
    vi.clearAllMocks();

    vi.mocked(chrome.bookmarks.getTree).mockResolvedValue([
      {
        id: "0",
        title: "",
        children: [
          { id: "1", title: "Bookmarks Bar" },
          { id: "2", title: "Other Bookmarks", children: [] },
        ],
      },
    ] as chrome.bookmarks.BookmarkTreeNode[]);
    vi.mocked(chrome.bookmarks.getChildren).mockResolvedValue([]);
    vi.mocked(chrome.bookmarks.create).mockImplementation(
      (props) =>
        Promise.resolve({
          id: `bm-${Date.now()}-${Math.random()}`,
          title: props.title ?? "",
          url: props.url,
          parentId: props.parentId,
        }) as Promise<chrome.bookmarks.BookmarkTreeNode>
    );
    vi.mocked(chrome.bookmarks.remove).mockResolvedValue();

    // Reset storage mock to empty managedBookmarkIds
    vi.mocked(chrome.storage.local.get).mockImplementation((keys) => {
      const keyArr = typeof keys === "string" ? [keys] : keys as string[];
      const result: Record<string, unknown> = {};
      for (const k of keyArr) {
        if (k === "managedBookmarkIds") result[k] = [];
      }
      return Promise.resolve(result);
    });
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
  });

  describe("getOrCreateFolder", () => {
    it("creates a new folder when it does not exist", async () => {
      const folderId = await manager.getOrCreateFolder("Open PRs");

      expect(chrome.bookmarks.create).toHaveBeenCalledWith({
        parentId: "2",
        title: "Open PRs",
      });
      expect(folderId).toBeTruthy();
    });

    it("reuses existing folder when it exists", async () => {
      vi.mocked(chrome.bookmarks.getTree).mockResolvedValue([
        {
          id: "0",
          title: "",
          children: [
            { id: "1", title: "Bookmarks Bar" },
            {
              id: "2",
              title: "Other Bookmarks",
              children: [{ id: "existing-folder", title: "Open PRs" }],
            },
          ],
        },
      ] as chrome.bookmarks.BookmarkTreeNode[]);

      const folderId = await manager.getOrCreateFolder("Open PRs");

      expect(chrome.bookmarks.create).not.toHaveBeenCalled();
      expect(folderId).toBe("existing-folder");
    });

    it("does not match a bookmark (with URL) as a folder", async () => {
      vi.mocked(chrome.bookmarks.getTree).mockResolvedValue([
        {
          id: "0",
          title: "",
          children: [
            { id: "1", title: "Bookmarks Bar" },
            {
              id: "2",
              title: "Other Bookmarks",
              children: [
                { id: "bm-1", title: "Open PRs", url: "https://example.com" },
              ],
            },
          ],
        },
      ] as chrome.bookmarks.BookmarkTreeNode[]);

      await manager.getOrCreateFolder("Open PRs");
      // Should create a new folder since existing one has a URL (it's a bookmark not folder)
      expect(chrome.bookmarks.create).toHaveBeenCalled();
    });
  });

  describe("syncBookmarks", () => {
    it("adds bookmarks for new PRs", async () => {
      const prs = [
        makePR(1, "https://ado/pr/1"),
        makePR(2, "https://ado/pr/2"),
      ];

      await manager.syncBookmarks(prs, "Open PRs");

      expect(chrome.bookmarks.create).toHaveBeenCalledTimes(3); // 1 folder + 2 bookmarks
    });

    it("does not add duplicate bookmarks for existing URLs", async () => {
      vi.mocked(chrome.bookmarks.getChildren).mockResolvedValue([
        { id: "bm-existing", title: "PR 1", url: "https://ado/pr/1" },
      ] as chrome.bookmarks.BookmarkTreeNode[]);

      const prs = [
        makePR(1, "https://ado/pr/1"), // already exists
        makePR(2, "https://ado/pr/2"), // new
      ];

      await manager.syncBookmarks(prs, "Open PRs");

      // Should only create folder + 1 new bookmark (PR 2)
      const createCalls = vi.mocked(chrome.bookmarks.create).mock.calls;
      const bookmarkCreates = createCalls.filter((c) => c[0].url);
      expect(bookmarkCreates).toHaveLength(1);
      expect(bookmarkCreates[0][0].url).toBe("https://ado/pr/2");
    });

    it("removes bookmarks for closed PRs that we created", async () => {
      const managedId = "bm-managed";
      vi.mocked(chrome.storage.local.get).mockImplementation((keys) => {
        const keyArr = typeof keys === "string" ? [keys] : keys as string[];
        const result: Record<string, unknown> = {};
        for (const k of keyArr) {
          if (k === "managedBookmarkIds") result[k] = [managedId];
        }
        return Promise.resolve(result);
      });

      vi.mocked(chrome.bookmarks.getChildren).mockResolvedValue([
        { id: managedId, title: "Old PR", url: "https://ado/pr/old" },
      ] as chrome.bookmarks.BookmarkTreeNode[]);

      // Sync with empty PRs — the old one should be removed
      await manager.syncBookmarks([], "Open PRs");

      expect(chrome.bookmarks.remove).toHaveBeenCalledWith(managedId);
    });

    it("does NOT remove bookmarks it did not create", async () => {
      vi.mocked(chrome.bookmarks.getChildren).mockResolvedValue([
        { id: "user-bookmark", title: "User's bookmark", url: "https://example.com" },
      ] as chrome.bookmarks.BookmarkTreeNode[]);

      await manager.syncBookmarks([], "Open PRs");

      expect(chrome.bookmarks.remove).not.toHaveBeenCalled();
    });

    it("updates managedBookmarkIds in storage after sync", async () => {
      const prs = [makePR(1, "https://ado/pr/1")];

      await manager.syncBookmarks(prs, "Open PRs");

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          managedBookmarkIds: expect.any(Array),
        })
      );
    });

    it("uses correct bookmark title format", async () => {
      const prs = [makePR(42, "https://ado/pr/42")];

      await manager.syncBookmarks(prs, "Open PRs");

      const createCalls = vi.mocked(chrome.bookmarks.create).mock.calls;
      const bookmarkCreates = createCalls.filter((c) => c[0].url);
      expect(bookmarkCreates[0][0].title).toBe("PR 42 — ProjectA/repo");
    });
  });
});

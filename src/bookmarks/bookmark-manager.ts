import type { CachedPR } from "@/storage/types";
import { getStorage, setStorage } from "@/storage/chrome-storage";

/**
 * Manages bookmark creation/deletion for PRs.
 * Only removes bookmarks that were created by this extension (tracked by ID).
 */
export class BookmarkManager {
  /**
   * Find an existing folder by name anywhere in the bookmark tree,
   * or create one under "Other Bookmarks" if not found.
   */
  async getOrCreateFolder(folderName: string): Promise<string> {
    const tree = await chrome.bookmarks.getTree();

    // Recursively search the entire tree for a folder with this name
    const findFolder = (nodes: chrome.bookmarks.BookmarkTreeNode[]): string | null => {
      for (const node of nodes) {
        if (node.title === folderName && !node.url) return node.id;
        if (node.children) {
          const found = findFolder(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const existing = findFolder(tree);
    if (existing) return existing;

    // Create under "Other Bookmarks" if no existing folder found
    const otherBookmarks = tree[0]?.children?.find(
      (c) => c.title === "Other bookmarks" || c.title === "Other Bookmarks"
    ) ?? tree[0]?.children?.[1];

    if (!otherBookmarks) {
      throw new Error("Could not find Other Bookmarks folder");
    }

    const folder = await chrome.bookmarks.create({
      parentId: otherBookmarks.id,
      title: folderName,
    });
    return folder.id;
  }

  /**
   * Sync bookmarks to match current PRs.
   * Adds new PR bookmarks and removes stale ones.
   */
  async syncBookmarks(
    prs: CachedPR[],
    folderName: string
  ): Promise<void> {
    const folderId = await this.getOrCreateFolder(folderName);
    const managedIds = (await getStorage("managedBookmarkIds")) ?? [];
    const prUrls = new Set(prs.map((pr) => pr.url));

    // Get existing bookmarks in the folder
    const children = await chrome.bookmarks.getChildren(folderId);

    // Remove bookmarks for closed PRs (only ones we created)
    const toRemove: string[] = [];
    for (const child of children) {
      if (managedIds.includes(child.id) && child.url && !prUrls.has(child.url)) {
        await chrome.bookmarks.remove(child.id);
        toRemove.push(child.id);
      }
    }

    // Add bookmarks for new PRs
    const existingUrls = new Set(children.map((c) => c.url).filter(Boolean));
    const newIds: string[] = [];
    for (const pr of prs) {
      if (!existingUrls.has(pr.url)) {
        const bm = await chrome.bookmarks.create({
          parentId: folderId,
          title: `${pr.title} — ${pr.projectName}/${pr.repositoryName}`,
          url: pr.url,
        });
        newIds.push(bm.id);
      }
    }

    // Update managed IDs
    const updatedIds = managedIds
      .filter((id) => !toRemove.includes(id))
      .concat(newIds);
    await setStorage("managedBookmarkIds", updatedIds);
  }
}

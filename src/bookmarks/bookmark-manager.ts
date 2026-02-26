import type { CachedPR } from "@/storage/types";
import { getStorage, setStorage } from "@/storage/chrome-storage";

/**
 * Manages bookmark creation/deletion for PRs.
 * Only removes bookmarks that were created by this extension (tracked by ID).
 */
export class BookmarkManager {
  /**
   * Find or create the bookmark folder by name under "Other Bookmarks".
   */
  async getOrCreateFolder(folderName: string): Promise<string> {
    const tree = await chrome.bookmarks.getTree();
    const otherBookmarks = tree[0]?.children?.find(
      (c) => c.title === "Other bookmarks" || c.title === "Other Bookmarks"
    ) ?? tree[0]?.children?.[1];

    if (!otherBookmarks) {
      throw new Error("Could not find Other Bookmarks folder");
    }

    // Search for existing folder
    const existing = otherBookmarks.children?.find(
      (c) => c.title === folderName && !c.url
    );
    if (existing) return existing.id;

    // Create folder
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

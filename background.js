var storage = {};  // visit counts mapped by bookmark ID
var bookmarkIds = [];   // sequential representation of bookamrks bar woth IDs only
var folderBookmarks = {};  // bookmark bar folder id's mapped by urls of bookmarks contained within
var barFolders = new Set();  // folders that exist in the bokmarks bar, ether at the top-level or nested
var lastUrl = "";
function getLocalStorage() {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get('storage', result => {
                console.log(result.storage);
                storage = result.storage || {};
                resolve(result.storage || {});
            })
        } catch (error) {
            reject({});
        }
    })
}

function getBookmarksBar () {
    return new Promise((resolve, reject) => {
        try {
            // uses the bold assumption that node with id 1 is the bookmarks bar for all users
            // however, documentation says that "Bookmarks bar" and "Other bookmarks" cannot be renamed or removed,
            // and that the root bookmarks folder cannot be modified in any way (this is where theose two folders are) 
            chrome.bookmarks.getChildren("1", children => {
                resolve(children);
            })
        } catch (error) {
            reject([]);
        }      
    })
}
async function getBookmarkIds() {
    // create an array of ids where the order matches the bookmarks bar
    let bar = await getBookmarksBar();
    return bar.map(bm => {return bm.id})
}
async function getFolderContents() {
    // generates a map of bookmark ids to the top-level 
    // stored in the global folderBookmarks object
    barFolders.clear();
    barFolders.add("1"); // insert bookmarks bar itself
    let bookmarks = await getBookmarksBar();
    for (let bm of bookmarks) {
        if (bm.url === undefined) {
            barFolders.add(bm.id);
            chrome.bookmarks.getChildren(bm.id, children => {
                innerFolderContents(bm.id, children);
            })
        }
    }
}
async function innerFolderContents(topFolderId, folderContents) {
    for (let bm of folderContents) {
        if (bm.url === undefined) {
            // recurse
            barFolders.add(bm.id);
            chrome.bookmarks.getChildren(bm.id, children => {
                innerFolderContents(topFolderId, children);
            })
        } else {
            folderBookmarks[bm.url] = topFolderId;
        }
    }
}
function bookmarkIndex(id) {
    // get the index of a bookmark in the bookmark bar given its id
    return new Promise((resolve, reject) => {
        try {
            chrome.bookmarks.get(id, results => {
                let bm = results[0];
                resolve(bm.index);
            })
        } catch (error) {
            reject(-1);
        }
    })
}
function bubbleUp(ind) {
    // Percolate a bookark ID up through bookmarkIds until it is in the proper position for its popularity in storage
    if (ind === 0) {
        return 0;
    } else if (ind < 0) {
        return ind
    }else if (storage[bookmarkIds[ind]] >= storage[bookmarkIds[ind - 1]]  || storage[bookmarkIds[ind-1]] === undefined) {
        // swap positions
        let temp = bookmarkIds[ind];
        bookmarkIds[ind] = bookmarkIds[ind - 1];
        bookmarkIds[ind - 1] = temp;
        return bubbleUp(ind-1);
    } else {
        return ind;
    }
}
function isBookmark(url) {
    // brute force for now - could be much better
    return new Promise(async (resolve, reject) => {
        let bookmarksBar = await getBookmarksBar();
        let bookmarked = bookmarksBar.map(bm => {
            if (bm.url === url){
                return parseInt(bm.id);
            } else if (folderBookmarks[url] === bm.id) {
                console.log('URL BELONGS TO A FOLDER NESTED BOOKMARK')
                return parseInt(bm.id);
            } else {
                return 0;
            }
        });
        console.log(bookmarked);
        console.log(Math.max(...bookmarked));
        resolve(Math.max(...bookmarked));
    })
}

function secureBookmarkUrl(bookmark) {
    // ensures that a bookmark starts with https://
    if (bookmark.url === undefined) {
        console.log(`bookmark ${bookmark.id} is a folder`);
    } else if (bookmark.url.startsWith('http://')) {
        // insert the s
        let newUrl = bookmark.url.split('');
        newUrl.splice(4, 0, 's');
        console.log(`secured ${newUrl.join('')}`);
        chrome.bookmarks.update(bookmark.id, {'url': newUrl.join('')});
    } else if (! bookmark.url.startsWith('https://')) {
        console.log(`secured ${'https://' + bookmark.url}`);
        chrome.bookmarks.update(bookmark.id, {'url': 'https://' + bookmark.url});
    } else {
        console.log(`Good url: ${bookmark.url}`);
    }
}

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete' && tab.active && tab.url != lastUrl) {
        console.log(`New page in tab ${tabId} going to ${tab.url}`);
        lastUrl = tab.url;
        let bookmarkId = await isBookmark(tab.url);  // will be 0 if not a bookmark
        if (bookmarkId) {
            let bmid = bookmarkId.toString();
            console.log(`this page ${bmid} is in the bookmarks bar`);
            let bmInd = await bookmarkIndex(bmid);
            if (storage[bmid] !== undefined) {
                storage[bmid] += 1;
            } else {
                storage[bmid] = 1;
            }
            let newIndex = bubbleUp(bmInd);
            console.log(`moving ${bookmarkId} from ${bmInd} to ${newIndex}`);
            if (newIndex >= 0) {
                chrome.bookmarks.move(bmid, {'index': newIndex}, details => {
                    chrome.storage.local.set({storage: storage}, () => {
                        console.log(storage);
                    })
                })
            }
        }
    }
});

chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
    // when a new bookmark is created, we'll add it to storage with a visit count of 1 (assuming that it was created via the bookmark star in the url bar, maning the user is currently on the site) but will not bubble it up
    if (bookmark.parentId === "1") {
        storage[id] = 1;
        secureBookmarkUrl(bookmark);
        bookmarkIds = await getBookmarkIds();
        chrome.storage.local.set({storage: storage}, () => {
            console.log('ok');
        })
    } else if (bookmark.url === undefined && barFolders.has(bookmark.parentId)) {
        console.log("New Folder in the bookmarks bar!")
        getFolderContents();
    }  
})

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
    // when user changes title or url of a bookmark
    if (changeInfo.url) {
        chrome.bookmarks.get(id, results => {
            secureBookmarkUrl(results[0]);
        })
    }
})

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
    if (removeInfo.parentId === "1") {
        bookmarkIds.splice(removeInfo.index, 1); // remove removeinfo.index from bookmarkIds
        delete storage[id]; // remove storage[id]
        console.log(`bookmark ${id} was deleted`);
        chrome.storage.local.set({storage: storage}, () => {
            console.log('ok');
        })// save changes to storage
        if (!removeInfo.node.url) {
            console.log("Top-level folder deleted");
            getFolderContents();
        }
    } else if (folderBookmarks[removeInfo.node.url] !== undefined || barFolders.has(id)) {
        // a nested bookmark or folder was deleted
        console.log("nested bookmark or folder deleted");
        getFolderContents();
    } 
})

chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
    // when a bookmark is moved between folders
    // also triggers on chrome.bookmarks.move. 
    if (moveInfo.parentId !== moveInfo.oldParentId) {
        if (moveInfo.parentId === "1") {  // moved to the bookmarks bar
            bookmarkIds.splice(moveInfo.index, 0, id);
            console.log(`bookmark ${id} was moved to bookmarks`);
        } else if (moveInfo.oldParentId === "1") {  // moved from the bookmarks bar
            bookmarkIds.splice(moveInfo.oldIndex, 1);
            delete storage[id];
            console.log(`bookmark ${id} was moved from bookmarks`);
            chrome.storage.local.set({storage: storage}, () => {
                console.log('ok');
            })
        } 
        if (barFolders.has(moveInfo.parentId) || barFolders.has(moveInfo.oldParentId)) {
            // bookmark was moved to or from a bookmark bar nested folder, and the folder structures should be rebuilt
            console.log("movement within bookmark bar folders");
            getFolderContents();
        }
    } else {
        if (storage[id] !== undefined) {
            console.log(`${id} was moved to ${moveInfo.index} from ${moveInfo.oldIndex}`);
            let currentBookmarkIds = await getBookmarkIds();
            if (currentBookmarkIds.join('') === bookmarkIds.join('')) {
                console.log('this was a script-made move');
                // ignore, everything is okay
            } else {
                console.log('this was a user UI move');
                // gotta fix it
                let newIndex = moveInfo.oldIndex;
                if (newIndex > moveInfo.index) {
                    newIndex += 1;
                }
                chrome.bookmarks.move(id, {'index': newIndex});
            }
        } else if (storage[id] === undefined && moveInfo.index < Object.keys(storage).length) {
            // an untracked bookmark has been inserted between tracked bookmarks
            chrome.bookmarks.move(id, {'index': Object.keys(storage).length + 1}, async details => {
                console.log(`untracked bookmark tried to infiltrate tracked section, kicked to index ${Object.keys(storage).length + 1}`)
                bookmarkIds = await getBookmarkIds();
            })
        } else {
            // untracked bookmarks moved among other untracked bookmarks
            console.log('untracked bookmark moved');
            bookmarkIds = await getBookmarkIds();  // update bookmarkIds or else there's a terrible glitch
        } 
    }
})

chrome.bookmarks.onChildrenReordered.addListener((id, reorderInfo) => {
    // triggered by user in the UI, not by chrome.bookmarks.move
    // this doesn't work. it will not trigger when draggin bookmarks in the chrome UI.
    console.log("CHILDREN REORDER");
    console.log(id);
    console.log(reorderInfo.childIds);
})

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        // set up initial bookmarks data structure
        console.log('Installing')
        storage = {};
        let bookmarksBar = await getBookmarksBar();
        bookmarksBar.forEach(bm => {secureBookmarkUrl(bm)})
        chrome.storage.local.set({storage: storage}, () => {
            console.log('ok');
        })
    }
    // no need to check for other reasons... yet
})

// when opening the browser, run this code to set up storage and bookmarkIds in memory
getLocalStorage();
getBookmarkIds().then(idMap => {bookmarkIds = idMap});
getFolderContents();
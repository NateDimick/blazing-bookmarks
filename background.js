/* 
// Simple bookmarks API examples
// get a single known bookmark by ID (in this case, this is my google bookmark)
chrome.bookmarks.get("377", results => {
    console.log(results);
})
// Move a single bookmark - int this case, move the google bookmark from it's current position to index 1 of it's current parent
chrome.bookmarks.move("377", {'index': 1}, result =>{
    console.log('moved google');
    console.log(result);
}); 
*/
function getLocalStorage() {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get('storage', result => {
                console.log(result.storage);
                storage = result.storage;
                resolve(result.storage || []);
            })
        } catch (error) {
            reject([]);
        }
    })
}
var storage = [];
getLocalStorage();
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
function bookmarkIndex(id) {
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
    if (ind === 0) {
        return 0;
    } else if (storage[ind].visits > storage[ind-1].visits) {
        // swap positions
        let temp = storage[ind];
        storage[ind] = storage[ind - 1];
        storage[ind - 1] = temp;
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
            } else if ('https://' + bm.url === url) {
                return parseInt(bm.id);
            } else {
                return 0;
            }
        });
        console.log(bookmarked);
        console.log(Math.max(...bookmarked));
        //const test = bookmarked.some((bool) => bool === true);
        resolve(Math.max(...bookmarked));
    })
}

/* chrome.bookmarks.getTree(treeNodeArray => {
    console.log("bookmarks:");
    console.log(treeNodeArray);
}) */

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete' && tab.active) {
        console.log(`New page in tab ${tabId} going to ${tab.url}`);
        let isInBar = await isBookmark(tab.url);
        console.log(isInBar);
        if (isInBar) {
            console.log(`this page ${isInBar} is in the bookmarks bar`);
            let bmi = await bookmarkIndex(isInBar.toString());
            storage[bmi].visits += 1;
            let newIndex = bubbleUp(bmi);
            console.log(`moving ${isInBar} from ${bmi} to ${newIndex}`);
            if (newIndex >= 0) {
                chrome.bookmarks.move(isInBar.toString(), {'index': newIndex}, details => {  // isInBar needs to be toString'd
                    console.log('ok');
                    chrome.storage.local.set({storage: storage}, () => {
                        console.log('ok');
                    })
                })
            }
        }
        
        
        // console.log(changeInfo);
        // console.log(tab);
        // console.log(window.location.href);
        // chrome.tabs.get(tabId, yourTab => {
        //     console.log(`Your tab @ ${yourTab.url || yourTab.pendingUrl}`);
        // })
    }
});

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    storage.push({
        id: id,
        url: bookmark.url,
        visits: 1
    });
})

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        // set up initial bookmarks data structure
        console.log('Installing')
        storage = [];
        let bookmarksBar = await getBookmarksBar();
        bookmarksBar.forEach(bm => {
            storage.push({
                id: bm.id,
                url: bm.url,
                visits: 0
            });
        })
        chrome.storage.local.set({storage: storage}, () => {
            console.log('ok');
        })
    }
    // no need to check for other reasons
})
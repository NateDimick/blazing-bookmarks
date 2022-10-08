# Blazing Bookmarks Bar - Sorts your bookmarks bar by visit frequency

I had this idea but a [reddit user](https://www.reddit.com/r/chrome/comments/2cgfti/how_do_i_sort_my_bookmarks_by_frequency_of/) apparently had it first, though no one has implemented it yet.

As you use your web browser and visit your favorite sites (that you've definitely put in you bookmarks bar, right?) this extension will automatically sort your bookmarks in order of how frequently you visit your bookmarks.

This extension will *not* extract bookmarks from folders in the bookmarks bar. It will also not sort the Other bookmarks or Mobile bookmarks folders (though adding those options could be a good future update).

## Resources

Just a few documentation links that have been referenced to build this extension.

* [bookmarks api docs](https://developer.chrome.com/extensions/bookmarks) (INCREDIBLY useful)
* [tabs api docs](https://developer.chrome.com/extensions/tabs#method-get) (needed just to get url of current webpage)
* [storage api docs](https://developer.chrome.com/extensions/storage) (somewhat handy)

## Development Roadmap

* initial build will be incredibly simple
  * visits are counted by 1
  * local storage only
  * **versions after 0.0.1 fit initial build spec**
* future builds will improve
  * utilize chrome sync for consistancy across multiple devices
  * limit tracking to top 100 bookmarks/folders only (maybe - on the fence about this one)
  * recommend new bookmarks for frequently visited unbookmarked sites via pop-up

...And of course, this is open source so any issues or new feature proposals will be strongly considered.

## Demo Build Instructions

Very easy for anyone who has experience with developing chrome extensions, for everyone else:

1. identify the location of this folder. write it down or remember it.
2. in your Chrome browser, enter **chrome://extensions** in the url bar
3. in the upper right, switch developer mode **on**
4. in the upper left, click **load unpacked**, locate this folder, and select it
5. The extension will now appear in your list of extensions. Make sure it is on by locating its tile and using the switch in the lower right

## Version History

| Date | Version | Headline | Comment |
| --- | --- | --- | --- |
| 11/10/20 | 0.0.1 | Day 1 Build | Initial working build |
| 11/11/20 | 0.0.2 | Day 2 Build | Simplify data structures, convert bookmarks to https |
| 11/12/20 | 0.0.3 | Day 3 Build | Extra event handling for moving and removing bookmarks |
| 11/13/20 | 0.0.4 | Day 4 Build | Some folder support, handling moving untracked bookmarks |
| 11/16/20 | 0.0.5 | Day 5 Build | Complete folder support |
| 11/17/20 | 0.0.6 | Day 6 Build | Add Icons and Popup |
| 11/18/20 | 0.0.7 | Day 7 Build | Add "options" page |
| 11/19/20 | 0.0.8 | Day 8 Build | redo icon (submitted day 7 build to chrome web store) |
| 10/08/22 | 0.0.9 | Manifest v3 | changes |

## How it Works

Under the hood there are two main data structures that allow this extension to work

* `storage` is a object that maps bookmark ids to visit tallies. `storage` is maintained in local borwser storage to persist between browser sessions.
* `bookmarkIds` is an array that mirrors the order of bookmarks on the bookmarks bar, but the array only stores ids. `bookmarkIds` is re-built every time the browser is opened.

Two additional data structures are needed for tracking bookmarks nested in folders

* `folderBookmarks` maps urls to the top-level bookmark id of the folder in the boomarks bar that bookmarked url is nested within
* `barFolders` is a set of folder ids that exist, in some capacity, at the top level or nested, in the bookmarks bar

`storage` is the only item stored locally (an, in the future, stored over sync storage), the others are re-built each time the browser is opened.

When the user visits a new webpage, this extension checks the url. if it matches the url of a bookmark, then it will do three things:

1. increment the visit count in `storage`
2. Percolate the bookmark's id in `bookmarkIds` to determine its new position on the bar
3. Instruct Chrome's bookmarks API to make the move to match `bookmarkIds`

## Design Justifications

### Incrementing visits by 1

Let's suppose that we're concerned that counting each visit will eventually cause integer overflow over the lifetime of a user. This actually isn't a problem, here's why: The maximum safe integer in javascript is 2^53. let's suppose a user uses the internet every day for the entirety of a 100 year life (a very bold assumption that infants and the extremely elderly will be daily internet users). For a vist count of a single website to exceed 2^53 in 100 years (36525 days) a user would have to visit that site ove *246 billion* times per day. This is not a problem.

### "Extension knows best"

Once a bookmark is tracked by this extension, the user will nto be able to manually move it in the bookmarks bar. It will snap back to its previous position. This is to ensure the bubbling up works properly. If a user really wants to move a bookmark, either move it to a different folder or uninstall the extansion.

### Ubuntu Folders: "As One"

Rather than micro managing the order within folders, for the purpose of sorting folders are considered a single entity, with a visit count comprised of the sum of all visits to its nested bookmarks. With the way that this extension works for standalone bookmarks in th ebar, this is what made sense for this extension.

### Limiting Tracked Bookmarks to 100

**(future feature)** 77 people across 6 group chats (a *highly* scientific study) reported how many bookmarks were in their bookmarks bar. The respondent reported a mean of 26 and a median of 17 bookmarks, with a standard deviation of 24. This information informed that 100 bookmarks would far exceed the needs for an average user, and would still be a valuable tool for outliers with libraries of bookmarks. Also 100 is just a great number.

## For the Sake of Arguement

This extension is **good** because:

* puts your most used bookmarks at the top of you bookmark list
* automatic - no thought involved
* over time will level out and not change so often - this is for *long term payoff*

This extension is **bad** because:

* it kills muscle memory
* ruins aesthetic of icons placed next to each other
* makes an absolute mess in the early stages of use
* poor algorithmic performance

## Other Notes

If your bookmark(s) redirect to another URL, then those bookmark(s) will not be reordered properly in the bookmark bar. Make sure that all your bookmarks **do not** redirect and begin with `https://` (the installation will do this for you, but anything added after install must not be edited)

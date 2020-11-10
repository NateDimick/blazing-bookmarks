# Bookmark Bar Most Used Sorter

I had this idea but a [reddit user](https://www.reddit.com/r/chrome/comments/2cgfti/how_do_i_sort_my_bookmarks_by_frequency_of/) aparently had it first, though no one has implemented it yet.

As you use your web browser and visit your favorite sites (that you've definitely put in you bookmarks bar, right?) this extension will automatically sort your bookmarks in order of how frequently you visit your bookmarks.

## Resources

Just a few documentation links that have been referenced to build this extension.

* [bookmarks api docs](https://developer.chrome.com/extensions/bookmarks)
* [tabs api docs](https://developer.chrome.com/extensions/tabs#method-get)
* [storage api docs](https://developer.chrome.com/extensions/storage)

## Development Roadmap

* initial build will be incredibly simple
  * visits are counted by 1
  * local storage only
* future builds will improve
  * utilize chrome sync
  * more robust visit counter
  * add icon
  * add to chrome extension store?

## Demo Build Instructions

Very easy for anyone who has experience with developing chrome extensions, for everyone else:

1. identify the location of this folder. write it down or remember it.
2. in your Chrome browser, enter **chrome://extensions** in the url bar
3. in the upper right, switch developer mode **on**
4. in the upper left, click **load unpacked**, locate this folder, and select it
5. The extension will now appear in your list of extensions. Make sure it is on by locating its tile and usign the switch in the lower right

## Version History

| Date | Version | Comment |
| --- | --- | --- |
| 11/10/20 | 0.0.1 | Day 1 Build |

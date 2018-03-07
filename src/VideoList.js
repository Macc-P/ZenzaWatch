const $ = require('jquery');
const _ = require('lodash');
const ZenzaWatch = {
  util:{},
  debug: {}
};
const util = {};
const AsyncEmitter = function() {};
const PopupMessage = {};
const FrameLayer = function() {};
const MylistPocket = function() {};
class NicoSearchApiV2Loader {}


//===BEGIN===

  var VideoListModel = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListModel.prototype, AsyncEmitter.prototype);
  _.assign(VideoListModel.prototype, {
    initialize: function(params) {
      //this._$container = params.$container;
      this._isUniq = params.uniq;
      this._items = [];
      this._maxItems = params.maxItems || 100;

      this._boundOnItemUpdate = this._onItemUpdate.bind(this);
    },
    setItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];

      this._items = itemList;
      if (this._isUniq) {
        this._items =
          _.uniq(this._items, false, function(item) { return item.getWatchId(); });
      }

      this.emit('update', this._items, true);
    },
    clear: function() {
      this.setItem([]);
    },
    insertItem: function(itemList, index) {
      //window.console.log('insertItem', itemList, index);
      itemList = _.isArray(itemList) ? itemList : [itemList];
      if (itemList.length < 1) { return; }
      index = Math.min(this._items.length, (_.isNumber(index) ? index : 0));

      Array.prototype.splice.apply(this._items, [index, 0].concat(itemList));

      if (this._isUniq) {
        _.each(itemList, (i) => { this.removeSameWatchId(i); });
      }

      this._items.splice(this._maxItems);
      this.emit('update', this._items);

      return this.indexOf(itemList[0]);
    },
    appendItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];
      if (itemList.length < 1) { return; }

      this._items = this._items.concat(itemList);

      if (this._isUniq) {
        _.each(itemList, (i) => { this.removeSameWatchId(i); });
      }

      while (this._items.length > this._maxItems) { this._items.shift(); }
      this.emit('update', this._items);

      return this._items.length - 1;
    },
    updateItem: function(index, videoInfo) {
      var target = this._getItemByIndex(index);
      if (!target) { return; }
      target.updateByVideoInfo(videoInfo);
    },
    removeItemByIndex: function(index) {
      var target = this._getItemByIndex(index);
      if (!target) { return; }
      this._items = _.reject(this._items, function(item) { return item === target; });
    },
    removePlayedItem: function() {
      var beforeLen = this._items.length;
      this._items =
        _.reject(this._items, function(item) { return !item.isActive() && item.isPlayed(); });
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    resetPlayedItemFlag: function() {
      _.each(this._items, function(item) {
        if (item.isPlayed()) {
          item.setIsPlayed(false);
        }
      });
      this.onUpdate();
    },
    removeNonActiveItem: function() {
      var beforeLen = this._items.length;
      this._items = _.reject(this._items, function(item) { return !item.isActive(); });
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    shuffle: function() {
      this._items = _.shuffle(this._items);
      this.emit('update', this._items);
    },
    getLength: function() {
      return this._items.length;
    },
    _getItemByIndex: function(index) {
      var item = this._items[index];
      return item;
    },
    indexOf: function(item) {
      return _.indexOf(this._items, item);
    },
    getItemByIndex: function(index) {
      var item = this._getItemByIndex(index);
      if (!item) { return null; }
      if (!item.hasBind) {
        item.hasBind = true;
        item.on('update', this._boundOnItemUpdate);
      }
      return item;
    },
    findByItemId: function(itemId) {
      itemId = parseInt(itemId, 10);
      return _.find(this._items, (item) => {
        if (item.getItemId() === itemId) {
          if (!item.hasBind) {
            item.hasBind = true;
            item.on('update', this._boundOnItemUpdate);
          }
          return true;
        }
      });
    },
    findByWatchId: function(watchId) {
      watchId = watchId + '';
      return _.find(this._items, (item) => {
        if (item.getWatchId() === watchId) {
          if (!item.hasBind) {
            item.hasBind = true;
            item.on('update', this._boundOnItemUpdate);
          }
          return true;
        }
      });
    },
    findActiveItem: function() {
      return _.find(this._items, (item) => {
        return item.isActive();
      });
    },
    removeItem: function(item) {
      var beforeLen = this._items.length;
      _.pull(this._items, item);
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    /**
     * パラメータで指定されたitemと同じwatchIdのitemを削除
     */
    removeSameWatchId: function(item) {
      const watchId = item.getWatchId();
      const beforeLen = this._items.length;
      _.remove(this._items, i => {
        return item !== i && i.getWatchId() === watchId;
      });
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    uniq: function(item) {
      this._items.forEach((i) => {
        if (i === item) { return; }
        this.removeSameWatchId(i);
      });
    },
    _onItemUpdate: function(item, key, value) {
      this.emit('itemUpdate', item, key, value);
    },
    getTotalDuration: function() {
      return _.reduce(this._items, function(result, item) {
        return result + item.getDuration();
      }, 0);
    },
    serialize: function() {
      return _.reduce(this._items, function(result, item) {
        result.push(item.serialize());
        return result;
      }, []);
    },
    unserialize: function(itemDataList) {
      var items = [];
      _.each(itemDataList, function(itemData) {
        items.push(new VideoListItem(itemData));
      });
      this.setItem(items);
    },
    sortBy: function(key, isDesc) {
      var table = {
        watchId:  'getWatchId',
        duration: 'getDuration',
        title:    'getSortTitle',
        comment:  'getCommentCount',
        mylist:   'getMylistCount',
        view:     'getViewCount',
        postedAt: 'getPostedAt',
      };
      var func = table[key];
      //window.console.log('sortBy', key, func, isDesc);
      if (!func) { return; }
      this._items = _.sortBy(this._items, function(item) { return item[func](); });
      if (isDesc) {
        this._items.reverse();
      }
      this.onUpdate();
    },
    onUpdate: function() {
      this.emitAsync('update', this._items);
    }
  });

/**
 * DOM的に隔離したiframeの中に生成する。
 * かなり実験要素が多いのでまだまだ変わる。
 */
  var VideoListView = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListView.prototype, AsyncEmitter.prototype);
  VideoListView.__css__ = '';

  VideoListView.__tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>VideoList</title>
<style type="text/css">
  body {
    -webkit-user-select: none;
    -moz-user-select: none;
    min-height: 100%;
  }

  body.drag-over>* {
    opacity: 0.5;
    pointer-events: none;
  }

  #listContainer {
    position: absolute;
    top: 0;
    left:0;
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    overflow-x: hidden;
    overflow-y: auto;
  }

  #listContainerInner {
    scroll-behavior: smooth;
  }


</style>
<style id="listItemStyle">%CSS%</style>
<body>
<div id="listContainer">
  <div id="listContainerInner"></div>
</div>
<div class="scrollToTop command" title="一番上にスクロール" data-command="scrollToTop">&#x2303;</div>
</body>
</html>

  `).trim();

  _.extend(VideoListView.prototype, AsyncEmitter.prototype);
  _.assign(VideoListView.prototype, {
    initialize: function(params) {
      this._ItemBuilder = params.builder || VideoListItemView;
      this._itemCss     = params.itemCss || VideoListItemView.__css__;
      this._className   = params.className || 'videoList';
      this._$container  = params.$container;

      this._retryGetIframeCount = 0;

      this._htmlCache = {};
      this._maxItems = params.max || 100;
      this._dragdrop = _.isBoolean(params.dragdrop) ? params.dragdrop : false;
      this._dropfile = _.isBoolean(params.dropfile) ? params.dropfile : false;

      this._model = params.model;
      if (this._model) {
        this._model.on('update',     _.debounce(this._onModelUpdate.bind(this), 100));
        this._model.on('itemUpdate', this._onModelItemUpdate.bind(this));
      }
      
      this._isLazyLoadImage = window.IntersectionObserver ? true : false;
      this._hasLazyLoad = {};

      this._initializeView(params);
    },
    _initializeView: function(params) {
      var html = VideoListView.__tpl__.replace('%CSS%', this._itemCss);
      this._frame = new FrameLayer({
        $container: params.$container,
        html: html,
        className: 'videoListFrame'
      });
      this._frame.on('load', this._onIframeLoad.bind(this));
    },
    _onIframeLoad: function(w) {
      var doc = this._document = w.document;
      var $win = this._$window = $(w);
      var $body = this._$body = $(doc.body);
      if (this._className) {
        $body.addClass(this._className);
      }

      this._$container = $body.find('#listContainer');
      var $list = this._$list = $(doc.getElementById('listContainerInner'));
      if (this._html) {
        $list.html(this._html);
        this._setInviewObserver();
      }
      $body.on('click', this._onClick.bind(this));
      $body.on('dblclick', this._onDblclick.bind(this));
      $body.on('keydown', function(e) {
        ZenzaWatch.emitter.emit('keydown', e);
      });
      $body.on('keyup', function(e) {
        ZenzaWatch.emitter.emit('keyup', e);
      });

      if (this._dragdrop) {
        $body.on('mousedown', this._onBodyMouseDown.bind(this));
      }

      if (this._dropfile) {
        $body
          .on('dragover',  this._onBodyDragOverFile .bind(this))
          .on('dragenter', this._onBodyDragEnterFile.bind(this))
          .on('dragleave', this._onBodyDragLeaveFile.bind(this))
          .on('drop',      this._onBodyDropFile     .bind(this));
      }

      MylistPocketDetector.detect().then((pocket) => {
        this._pocket = pocket;
        $body.addClass('is-pocketReady');
      });
    },
    _onBodyMouseDown: function(e) {
      var $item = $(e.target).closest('.videoItem');
      if ($item.length < 1) { return; }
      if ($(e.target).closest('.command').length > 0) { return; }
      this._$dragging = $item;
      this._dragOffset = {
        x: e.pageX,
        y: e.pageY,
        st: this.scrollTop()
      };
      this._$dragTarget = null;
      this._$body.find('.dragover').removeClass('dragover');
      this._bindDragStartEvents();
    },
    _bindDragStartEvents: function() {
      this._$body
        .on('mousemove.drag',  this._onBodyMouseMove .bind(this))
        .on('mouseup.drag',    this._onBodyMouseUp   .bind(this))
        .on('blur.drag',       this._onBodyBlur      .bind(this))
        .on('mouseleave.drag', this._onBodyMouseLeave.bind(this));
    },
    _unbindDragStartEvents: function() {
      this._$body
        .off('mousemove.drag')
        .off('mouseup.drag')
        .off('blur.drag')
        .off('mouseleave.drag');
    },
    _onBodyMouseMove: function(e) {
      if (!this._$dragging) { return; }
      var l = e.pageX - this._dragOffset.x;
      var r = e.pageY - this._dragOffset.y + (this.scrollTop() - this._dragOffset.st);
      var translate = ['translate(', l, 'px, ', r, 'px)'].join('');

      if (l * l + r * r < 100) { return; }

      this._$body.addClass('dragging');
      this._$dragging
        .addClass('dragging')
        .css('transform', translate);

      this._$body.find('.dragover').removeClass('dragover');
      var $target = $(e.target).closest('.videoItem');
      if ($target.length < 1) { return; }
      this._$dragTarget = $target.addClass('dragover');
    },
    _onBodyMouseUp: function(e) {
      this._unbindDragStartEvents();

      var $dragging = this._$dragging;
      this._endBodyMouseDragging();
      if (!$dragging) { return; }

      var $target = $(e.target).closest('.videoItem');
      if ($target.length < 1) { $target = this._$dragTarget; }
      if (!$target || $target.length < 1) { return; }
      var srcId = $dragging.attr('data-item-id'), destId = $target.attr('data-item-id');
      if (srcId === destId) { return; }

      $dragging.css({opacity: 0});
      this.emit('moveItem', srcId, destId);
    },
    _onBodyBlur: function() {
      this._endBodyMouseDragging();
    },
    _onBodyMouseLeave: function() {
      this._endBodyMouseDragging();
    },
    _endBodyMouseDragging: function() {
      this._unbindDragStartEvents();
      this._$body.removeClass('dragging');

      this._$dragTarget = null;
      this._$body.find('.dragover').removeClass('dragover');
      if (this._$dragging) {
        this._$dragging.removeClass('dragging').css('transform', '');
      }
      this._$dragging = null;
    },
    _onBodyDragOverFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$body.addClass('drag-over');
    },
    _onBodyDragEnterFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$body.addClass('drag-over');
    },
    _onBodyDragLeaveFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$body.removeClass('drag-over');
    },
    _onBodyDropFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$body.removeClass('drag-over');

      var file = e.originalEvent.dataTransfer.files[0];
      if (!/\.playlist\.json$/.test(file.name)) { return; }

      var fileReader = new FileReader();
      fileReader.onload = (ev) => {
        window.console.log('file data: ', ev.target.result);
        this.emit('filedrop', ev.target.result, file.name);
      };

      fileReader.readAsText(file);
    },
    _onModelUpdate: function(itemList, replaceAll) {
      window.console.time('update playlistView');
      this.addClass('updating');
      itemList = _.isArray(itemList) ? itemList: [itemList];
      var itemViews = [], Builder = this._ItemBuilder;

      if (replaceAll) { this._htmlCache = {}; }

      itemList.forEach((item) => {
        var id = item.getItemId();
        if (this._htmlCache[id]) {
          //window.console.log('from cache');
          itemViews.push(this._htmlCache[id]);
        } else {
          var isLazy = this._isLazyLoadImage && !this._hasLazyLoad[item.getWatchId()];
          var tpl = this._htmlCache[id] = (new Builder({
            item: item,
            isLazyLoadImage: isLazy
          })).toString();
          itemViews.push(tpl);
        }
      });

      this._html = itemViews.join('');

      window.setTimeout(() => {
        if (this._$list) { this._$list.html(this._html); }
        this._setInviewObserver();
      }, 0);

      window.setTimeout(() => {
        this.removeClass('updating');
        this.emit('update');
      }, 100);
      window.console.timeEnd('update playlistView');
    },
    _setInviewObserver: function() {
      if (!this._isLazyLoadImage || !this._document) { return; }
      if (this._intersectionObserver) {
        this._intersectionObserver.disconnect();
      }
      var onInview;
      if (!this._onImageInview_bind) {
        this._onImageInview_bind = this._onImageInview.bind(this);
      }
      onInview = this._onImageInview_bind;
      var observer = this._intersectionObserver = new window.IntersectionObserver(onInview);
      var images = this._document.querySelectorAll('img.lazy-load');
      for (var i = 0, len = images.length; i < len; i++) {
        observer.observe(images[i]);
      }
    },
    _onImageInview: function(entries) {
      var observer = this._intersectionObserver;
      for (var i = 0, len = entries.length; i < len; i++) {
        var entry = entries[i];
        var image = entry.target;
        var $image = $(image);
        var src = $image.attr('data-src');
        var watchId = $image.attr('data-watch-id');
        var itemId = $image.attr('data-item-id');
        $image.removeClass('lazy-load');
        observer.unobserve(image);

        if (!src) { continue; }
        $image.attr('src', src);
        if (watchId) { this._hasLazyLoad[watchId] = true; }
        if (itemId) { this._htmlCache[itemId] = null; }
      }
    },
    _onModelItemUpdate: function(item, key, value) {
      //window.console.log('_onModelItemUpdate', item, item.getItemId(), item.getTitle(), key, value);
      if (!this._$body) { return; }
      var itemId = item.getItemId();
      var $item = this._$body.find('.videoItem.item' + itemId);

      this._htmlCache[itemId] = (new this._ItemBuilder({item: item})).toString();
      if (key === 'active') {
        this._$body.find('.videoItem.active').removeClass('active');

        $item.toggleClass('active', value);
        //if (value) { this.scrollToItem(itemId); }

      } else if (key === 'updating' || key === 'played') {
        $item.toggleClass(key, value);
      } else {
        var $newItem = $(this._htmlCache[itemId]);
        $item.before($newItem);
        $item.remove();
      }
    },
    _onClick: function(e) {
      e.stopPropagation();
      ZenzaWatch.emitter.emitAsync('hideHover');
      var $target = $(e.target).closest('.command');
      var $item = $(e.target).closest('.videoItem');
      if ($target.length > 0) {
        e.stopPropagation();
        e.preventDefault();
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param');
        var itemId  = $item.attr('data-item-id');
        switch (command) {
          case 'deflistAdd':
            this.emit('deflistAdd', param, itemId);
            break;
          case 'playlistAppend':
            this.emit('playlistAppend', param, itemId);
            break;
          case 'pocket-info':
            window.setTimeout(() => { this._pocket.external.info(param); }, 100);
            break;
          case 'scrollToTop':
            this.scrollTop(0, 300);
            break;
          case 'playlistRemove':
            $item.remove();
            this.emit('command', command, param, itemId);
            break;
          default:
            this.emit('command', command, param, itemId);
        }
      }
    },
    _onDblclick: function(e) {
      var $target = $(e.target).closest('.command');
      var command = $target.attr('data-command');
      if (!command) {
        this.emit('dblclick', e);
      } else {
        e.stopPropagation();
      }
    },
    addClass: function(className) {
      this.toggleClass(className, true);
    },
    removeClass: function(className) {
      this.toggleClass(className, false);
    },
    toggleClass: function(className, v) {
      if (!this._$body) { return; }
      this._$body.toggleClass(className, v);
    },
    scrollTop: function(v) {
      if (!this._$container) { return 0; }
      if (typeof v === 'number') {
        this._$container.scrollTop(v);
      } else {
        return this._$container.scrollTop();
      }
    },
    scrollToItem: function(itemId) {
      if (!this._$body) { return; }
      if (_.isFunction(itemId.getItemId)) { itemId = itemId.getItemId(); }
      var $target = this._$body.find('.item' + itemId);
      if ($target.length < 1) { return; }
      var top = Math.max(0, $target.offset().top - 8 + this.scrollTop());
      this.scrollTop(top);
    }
  });

  // なんか汎用性を持たせようとして失敗してる奴
  var VideoListItemView = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListItemView.prototype, AsyncEmitter.prototype);

  VideoListItemView.ITEM_HEIGHT = 100;
  VideoListItemView.THUMBNAIL_WIDTH  = 96;
  VideoListItemView.THUMBNAIL_HEIGHT = 72;

  // ここはDOM的に隔離されてるので外部要因との干渉を考えなくてよい
  VideoListItemView.__css__ = (`
    * {
      box-sizing: border-box;
    }

    body {
      background: #333;
      overflow-x: hidden;
      counter-reset: video;
    }

    #listContainer::-webkit-scrollbar {
      background: #222;
    }

    #listContainer::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #666;
    }

    #listContainer::-webkit-scrollbar-button {
      background: #666;
      display: none;
    }

    .scrollToTop {
      position: fixed;
      width: 32px;
      height: 32px;
      right: 32px;
      bottom: 8px;
      font-size: 24px;
      line-height: 32px;
      text-align: center;
      z-index: 100;
      background: #ccc;
      color: #000;
      border-radius: 100%;
      cursor: pointer;
      opacity: 0.3;
      transition: opacity 0.4s ease;
    }

    .scrollToTop:hover {
      opacity: 0.9;
      box-shadow: 0 0 8px #fff;
    }

    .videoItem {
      position: relative;
      display: inline-block;
      width: 100%;
      height: ${VideoListItemView.ITEM_HEIGHT}px;
      overflow: hidden;
      transition:
        transform 0.4s ease, box-shadow 0.4s ease,
        margin-left 0.4s ease, margin-top 0.4s ease;
    }

    .playlist .videoItem {
      cursor: move;
    }


    .playlist .videoItem::before {
        content: counter(video);
        counter-increment: video;
        position: absolute;
        right: 8px;
        top: 80%;
        color: #666;
        font-family: Impact;
        font-size: 45px;
        pointer-events: none;
        z-index: 1;
        line-height: ${VideoListItemView.ITEM_HEIGHT}px;
        opacity: 0.6;

        transform: translate(0, -50%);
    }

    .videoItem.updating {
      opacity: 0.5;
      cursor: wait;
    }

    .videoItem.dragging {
      pointer-events: none;
      box-shadow: 8px 8px 4px #000;
      background: #666;
      opacity: 0.8;
      transition:
        box-shadow 0.4s ease,
        margin-left 0.4s ease, margin-top 0.4s ease;
      z-index: 10000;
    }

    body.dragging * {
      cursor: move;
    }

    body.dragging .videoItem.dragover {
      outline: 5px dashed #99f;
    }

    body.dragging .videoItem.dragover * {
      opacity: 0.3;
    }

    body:not(.is-pocketReady) .pocket-info {
      display: none !important;
    }


    .videoItem + .videoItem {
      border-top: 1px dotted #888;
      margin-top: 4px;
      outline-offset: -8px;
    }

    .separator + .videoItem {
      border-top: 1px dotted #333;
    }

    .videoItem .thumbnailContainer {
      position: absolute;
      top: 0;
      left: 0;
      width:  ${VideoListItemView.THUMBNAIL_WIDTH}px;
      height: ${VideoListItemView.THUMBNAIL_HEIGHT}px;
      margin: 4px 4px 0;
    }

    .videoItem .thumbnailContainer .thumbnail {
      transition: box-shaow 0.4s ease, outline 0.4s ease, transform 0.4s ease;
      width:  ${VideoListItemView.THUMBNAIL_WIDTH}px;
      height: ${VideoListItemView.THUMBNAIL_HEIGHT}px;
    }

    .videoItem .thumbnailContainer .thumbnail:active {
      box-shadow: 0 0 8px #f99;
      transform: translate(0, 4px);
      transition: none;
    }


    .videoItem .thumbnailContainer .playlistAppend,
    .videoItem .playlistRemove,
    .videoItem .thumbnailContainer .deflistAdd,
    .videoItem .thumbnailContainer .pocket-info {
      position: absolute;
      display: none;
      color: #fff;
      background: #666;
      width: 24px;
      height: 20px;
      line-height: 18px;
      font-size: 14px;
      box-sizing: border-box;
      text-align: center;
      font-weight: bolder;

      color: #fff;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .videoItem .thumbnailContainer .playlistAppend {
      left: 0;
      bottom: 0;
    }
    .videoItem .playlistRemove {
      right: 8px;
      top: 0;
    }
    .videoItem .thumbnailContainer .deflistAdd {
      right: 0;
      bottom: 0;
    }
    .videoItem .thumbnailContainer .pocket-info {
      right: 24px;
      bottom: 0;
    }
    .playlist .videoItem .playlistAppend {
      display: none !important;
    }
    .videoItem .playlistRemove {
      display: none;
    }
    .playlist .videoItem:not(.active):hover .playlistRemove {
      display: inline-block;
    }


    .playlist .videoItem:not(.active):hover .playlistRemove,
    .videoItem:hover .thumbnailContainer .playlistAppend,
    .videoItem:hover .thumbnailContainer .deflistAdd,
    .videoItem:hover .thumbnailContainer .pocket-info {
      display: inline-block;
      border: 1px outset;
    }

    .playlist .videoItem:not(.active):hover .playlistRemove:hover,
    .videoItem:hover .thumbnailContainer .playlistAppend:hover,
    .videoItem:hover .thumbnailContainer .deflistAdd:hover,
    .videoItem:hover .thumbnailContainer .pocket-info:hover {
      transform: scale(1.5);
      box-shadow: 2px 2px 2px #000;
    }

    .playlist .videoItem:not(.active):hover .playlistRemove:active,
    .videoItem:hover .thumbnailContainer .playlistAppend:active,
    .videoItem:hover .thumbnailContainer .deflistAdd:active,
    .videoItem:hover .thumbnailContainer .pocket-info:active {
      transform: scale(1.3);
      border: 1px inset;
      transition: none;
    }

    .videoItem.updating .thumbnailContainer .deflistAdd {
      transform: scale(1.0) !important;
      border: 1px inset !important;
      pointer-events: none;
    }

    .videoItem .thumbnailContainer .duration {
      position: absolute;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      font-size: 12px;
      color: #fff;
    }
    .videoItem:hover .thumbnailContainer .duration {
      display: none;
    }

    .videoItem .videoInfo {
      posigion: absolute;
      top: 0;
      margin-left: 104px;
      height: 100%;
    }

    .videoItem .postedAt {
      font-size: 12px;
      color: #ccc;
    }
    .videoItem.played .postedAt::after {
      content: ' ●';
      font-size: 10px;
    }

    .videoItem .counter {
      position: absolute;
      top: 80px;
      width: 100%;
      text-align: center;
    }

    .videoItem .title {
      height: 52px;
      overflow: hidden;
    }

    .videoItem .videoLink {
      font-size: 14px;
      color: #ff9;
      transition: background 0.4s ease, color 0.4s ease;
    }
    .videoItem .videoLink:visited {
      color: #ffd;
    }

    .videoItem .videoLink:active {
      color: #fff;
      background: #663;
      transition: none;
    }


    .videoItem.noVideoCounter .counter {
      display: none;
    }
    .videoItem .counter {
      font-size: 12px;
      color: #ccc;
    }
    .videoItem .counter .value {
      font-weight: bolder;
    }
    .videoItem .counter .count {
      white-space: nowrap;
    }
    .videoItem .counter .count + .count {
      margin-left: 8px;
    }

    .videoItem.active {
      /*outline: dashed 2px #ff8;
      outline-offset: 4px;*/
      border: none !important;
      background: #776;
    }

    @keyframes dropbox {
        0% {  }
        5% {  opacity: 0.8; }
       99% { box-shadow: 8px 8px 8px #000;
             transform: translate(0, 500px); opacity: 0.5; }
      100% { opacity: 0; }
    }

    .videoItem.deleting {
      pointer-events: none;
      animation-name: dropbox;
      animation-iteration-count: 1;
      animation-timing-function: ease-in;
      animation-duration: 0.5s;
      animation-fill-mode: forwards;
    }

    @media screen and (min-width: 600px)
    {
      #listContainerInner {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      }

      .videoItem {
        margin: 0 8px;
        border-top: none !important;
        border-bottom: 1px dotted #888;
      }
    }

  `).trim();

  VideoListItemView.__tpl__ = (`
    <div class="videoItem %className% watch%watchId% item%itemId% %active% %updating% %played%"
      data-item-id="%itemId%"
      data-watch-id="%watchId%">
      <span class="command playlistRemove" data-command="playlistRemove" data-param="%watchId%" title="プレイリストから削除">×</span>
      <div class="thumbnailContainer">
        <a href="//www.nicovideo.jp/watch/%watchId%" class="command" data-command="select" data-param="%itemId%">
          <img class="thumbnail %isLazy%" %src%="%thumbnail%" data-watch-id="%watchId%" data-item-id="%itemId%" decoding="async">
          <span class="duration">%duration%</span>
          <span class="command playlistAppend" data-command="playlistAppend" data-param="%watchId%" title="プレイリストに追加">▶</span>
          <span class="command deflistAdd" data-command="deflistAdd" data-param="%watchId%" title="とりあえずマイリスト">&#x271A;</span>
          <span class="command pocket-info" data-command="pocket-info" data-param="%watchId%" title="動画情報">？</span>
        </a>
      </div>
      <div class="videoInfo">
        <div class="postedAt">%postedAt%</div>
        <div class="title">
          <a href="//www.nicovideo.jp/watch/%watchId%" class="command videoLink" data-command="select" data-param="%itemId%" title="%videoTitle%">
            %videoTitle%
          </a>
        </div>
      </div>
      <div class="counter">
        <span class="count">再生: <span class="value">%viewCount%</span></span>
        <span class="count">コメ: <span class="value">%commentCount%</span></span>
        <span class="count">マイ: <span class="value">%mylistCount%</span></span>
      </div>
   </div>
  `).trim();

  _.assign(VideoListItemView.prototype, {
    initialize: function(params) {
      this.watchId = params.watchId;
      this._item = params.item;
      this._isLazy = _.isBoolean(params.isLazyLoadImage) ? params.isLazyLoadImage : false;
    },
    build: function() {
      var tpl = VideoListItemView.__tpl__;
      var item = this._item;

      // 動画タイトルはあらかじめエスケープされている。
      // ・・・のだが、データのいいかげんさから見て、
      // 本当に全部やってあるの？って信用できない。(古い動画は特にいいかげん)
      // なので念のためescapeしておく。過剰エスケープになっても気にしない
      var title = util.escapeToZenkaku(item.getTitle());
      var esc = util.escapeHtml;

      var count = item.getCount();
      //window.console.log('item', item, item.getThumbnail());
      tpl = tpl
        .replace(/%active%/g,     item.isActive() ? 'active' : '')
        .replace(/%played%/g,     item.isPlayed() ? 'played' : '')
        .replace(/%updating%/g,   item.isUpdating() ? 'updating' : '')
        .replace(/%watchId%/g,    esc(item.getWatchId()))
        .replace(/%itemId%/g,     parseInt(item.getItemId(), 10))
        .replace(/%postedAt%/g,   esc(item.getPostedAt()))
        .replace(/%videoTitle%/g, title)
        .replace(/%thumbnail%/g,  esc(item.getThumbnail() || ''))
        .replace(/%duration%/g,   this._secToTime(item.getDuration()))
        .replace(/%viewCount%/g,    this._addComma(count.view))
        .replace(/%commentCount%/g, this._addComma(count.comment))
        .replace(/%mylistCount%/g,  this._addComma(count.mylist))
        .replace(/%isLazy%/g,  this._isLazy ? 'lazy-load' : '')
        .replace(/%src%/g,  this._isLazy ? 'data-src' : 'src')
        .replace(/%className%/g, '')
        ;
      return tpl;
    },
    getWatchId: function() {
      return this._item.getWatchId();
    },
    toString: function() {
      return this.build();
    },
    _secToTime: function(sec) {
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      return [m, s].join(':');
    },
    _addComma: function(m) {
      if (isNaN(m)) { return '---'; }
      return m.toLocaleString ? m.toLocaleString() : ZenzaWatch.util.escapeHtml(m);
    }
  });

  var VideoListItem = function() { this.initialize.apply(this, arguments); };
  VideoListItem._itemId = 0;
  VideoListItem.createByThumbInfo = function(info) {
    return new VideoListItem({
      _format:        'thumbInfo',
      id:             info.id,
      title:          info.title,
      length_seconds: info.duration,
      num_res:        info.commentCount,
      mylist_counter: info.mylistCount,
      view_counter:   info.viewCount,
      thumbnail_url:  info.thumbnail,
      first_retrieve: info.postedAt,

      tags:           info.tagList,
      movieType:      info.movieType,
      owner:          info.owner,
      lastResBody:    info.lastResBody
    });
  };

  VideoListItem.createBlankInfo = function(id) {
    var postedAt = '0000/00/00 00:00:00';
    if (!isNaN(id)) {
      postedAt = util.dateToString(new Date(id * 1000));
    }
    return new VideoListItem({
      _format:        'blank',
      id:             id,
      title:          id + '(動画情報不明)',
      length_seconds: 0,
      num_res:        0,
      mylist_counter: 0,
      view_counter:   0,
      thumbnail_url:  '//uni.res.nimg.jp/img/user/thumb/blank_s.jpg',
      first_retrieve: postedAt,
    });
  };

  VideoListItem.createByMylistItem = function(item) {
    if (item.item_data) {
      var item_data = item.item_data || {};
      return new VideoListItem({
        _format:        'mylistItemOldApi',
        id:             item_data.watch_id,
        title:          item_data.title,
        length_seconds: item_data.length_seconds,
        num_res:        item_data.num_res,
        mylist_counter: item_data.mylist_counter,
        view_counter:   item_data.view_counter,
        thumbnail_url:  item_data.thumbnail_url,
        first_retrieve: util.dateToString(new Date(item_data.first_retrieve * 1000)),

        videoId:        item_data.video_id,
        lastResBody:    item_data.last_res_body,
        mylistItemId:   item.item_id,
        item_type:      item.item_type
      });
    }

    // APIレスポンスの統一されてなさよ・・・
    if (!item.length_seconds && _.isString(item.length)) {
      var tmp = item.length.split(':');
      item.length_seconds = tmp[0] * 60 + tmp[1] * 1;
    }
    return new VideoListItem({
      _format:        'mylistItemRiapi',
      id:             item.id,
      title:          item.title,
      length_seconds: item.length_seconds,
      num_res:        item.num_res,
      mylist_counter: item.mylist_counter,
      view_counter:   item.view_counter,
      thumbnail_url:  item.thumbnail_url,
      first_retrieve: item.first_retrieve,

      lastResBody:    item.last_res_body,
    });
  };

  VideoListItem.createByVideoInfoModel = function(info) {
    var count = info.count;

    return new VideoListItem({
      _format:        'thumbInfo',
      id:             info.watchId,
      title:          info.title,
      length_seconds: info.duration,
      num_res:        count.comment,
      mylist_counter: count.mylist,
      view_counter:   count.view,
      thumbnail_url:  info.thumbnail,
      first_retrieve: info.postedAt,

      owner:          info.ownerInfo
    });
  };


  _.extend(VideoListItem.prototype, AsyncEmitter.prototype);
  _.assign(VideoListItem.prototype, {
    initialize: function(rawData) {
      this._rawData = rawData;
      this._itemId = VideoListItem._itemId++;
      this._isActive = false;
      this._isUpdating = false;
      this._isPlayed = !!rawData.played;
      rawData.first_retrieve = util.dateToString(rawData.first_retrieve);

      this._sortTitle = this.getTitle()
        .replace(/([0-9]{1,9})/g, (m) => { return '0'.repeat(10 - m.length) + m; })
        .replace(/([０-９]{1,9})/g, (m) => { return '０'.repeat(10 - m.length) + m; });
    },
    _getData: function(key, defValue) {
      return this._rawData.hasOwnProperty(key) ?
        this._rawData[key] : defValue;
    },
    getItemId: function() {
      return this._itemId;
    },
    getWatchId: function() {
      return (this._getData('id', '') || '').toString();
    },
    getTitle: function() {
      return this._getData('title', '');
    },
    getSortTitle: function() {
      return this._sortTitle;
    },
    getDuration: function() {
      return parseInt(this._getData('length_seconds', '0'), 10);
    },
    getCount: function() {
      return {
        comment: parseInt(this._rawData.num_res,        10),
        mylist:  parseInt(this._rawData.mylist_counter, 10),
        view:    parseInt(this._rawData.view_counter,   10)
      };
    },
    getCommentCount: function() { return parseInt(this._rawData.num_res,        10); },
    getMylistCount:  function() { return parseInt(this._rawData.mylist_counter, 10); },
    getViewCount:    function() { return parseInt(this._rawData.view_counter,   10); },
    getThumbnail: function() {
      return this._rawData.thumbnail_url;
    },
    getBetterThumbnail: function() {
      var watchId = this.getWatchId();
      var hasLargeThumbnail = util.hasLargeThumbnail(watchId);
      return this._rawData.thumbnail + (hasLargeThumbnail ? '.L' : '');
    },
    getPostedAt: function() {
      return this._rawData.first_retrieve;
    },
    isActive: function() {
      return this._isActive;
    },
    setIsActive: function(v) {
      v = !!v;
      if (this._isActive !== v) {
        this._isActive = v;
        this.emit('update', this, 'active', v);
      }
    },
    isUpdating: function() {
      return this._isUpdating;
    },
    setIsUpdating: function(v) {
      v = !!v;
      if (this._isUpdating !== v) {
        this._isUpdating = v;
        this.emit('update', this, 'updating', v);
      }
    },
    isPlayed: function() {
      return this._isPlayed;
    },
    setIsPlayed: function(v) {
      v = !!v;
      if (this._isPlayed !== v) {
        this._isPlayed = v;
        this.emit('update', this, 'played', v);
      }
    },
    isBlankData: function() {
      return this._rawData._format === 'blank';
    },
    serialize: function() {
      return {
        active:         this._isActive,
        played:         this._isPlayed,
        id:             this._rawData.id,
        title:          this._rawData.title,
        length_seconds: this._rawData.length_seconds,
        num_res:        this._rawData.num_res,
        mylist_counter: this._rawData.mylist_counter,
        view_counter:   this._rawData.view_counter,
        thumbnail_url:  this._rawData.thumbnail_url,
        first_retrieve: this._rawData.first_retrieve,
      };
    },
    updateByVideoInfo: function(videoInfo) {
      const before = JSON.stringify(this.serialize());
      const rawData = this._rawData;
      const count = videoInfo.count;
      rawData.first_retrieve = util.dateToString(videoInfo.postedAt);

      rawData.num_res        = count.comment;
      rawData.mylist_counter = count.mylist;
      rawData.view_counter   = count.view;

      rawData.thumbnail_url = videoInfo.thumbnail;

      if (JSON.stringify(this.serialize()) !== before) {
        this.emit('update', this);
      }
    }
  });

  var VideoList = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoList.prototype, AsyncEmitter.prototype);
  _.assign(VideoList.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;

      this._model = new VideoListModel({
        uniq: true,
        maxItem: 100
      });

      this._initializeView();
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new VideoListView({
        $container: this._$container,
        model: this._model,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });

      this._view.on('command',        this._onCommand     .bind(this));
      this._view.on('deflistAdd',     this._onDeflistAdd  .bind(this));
      this._view.on('playlistAppend', this._onPlaylistAdd .bind(this));
    },
    update: function(listData, watchId) {
      if (!this._view) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      _.each(listData, function(itemData) {
        if (!itemData.has_data) { return; }
        items.push(new VideoListItem(itemData));
      });
      if (items.length < 1) { return; }
      this._view.insertItem(items);
    },
    _onCommand: function(command, param) {
      if (command === 'select') {
        var item = this._model.findByItemId(param);
        var watchId = item.getWatchId();
        this.emit('command', 'open', watchId);
        return;
      }
      this.emit('command', command, param);
    },
    _onPlaylistAdd: function(watchId , itemId) {
      this.emit('command', 'playlistAppend', watchId);
      if (this._isUpdatingPlaylist) { return; }
      var item = this._model.findByItemId(itemId);

      const unlock = () => {
        item.setIsUpdating(false);
        this._isUpdatingPlaylist = false;
      };

      item.setIsUpdating(true);
      this._isUpdatingPlaylist = true;

      window.setTimeout(unlock, 1000);
    },
    _onDeflistAdd: function(watchId , itemId) {
      if (this._isUpdatingDeflist) { return; }
      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }
      var item = this._model.findByItemId(itemId);

      const unlock = () => {
        item.setIsUpdating(false);
        this._isUpdatingDeflist = false;
      };

      item.setIsUpdating(true);
      this._isUpdatingDeflist = true;

      var timer = window.setTimeout(unlock, 10000);

      var onSuccess = this._onDeflistAddSuccess.bind(this, timer, unlock);
      var onFail    = this._onDeflistAddFail   .bind(this, timer, unlock);
      return this._thumbInfoLoader.load(watchId).then((info) => {
        var description = '投稿者: ' + info.owner.name;
        return this._mylistApiLoader.addDeflistItem(watchId, description)
          .then(onSuccess, onFail);
      }, () => {
        return this._mylistApiLoader.addDeflistItem(watchId)
          .then(onSuccess, onFail);
      });
    },
    _onDeflistAddSuccess: function(timer, unlock, result) {
      window.clearTimeout(timer);
      timer = window.setTimeout(unlock, 500);
      this.emit('command', 'notify', result.message);
    },
    _onDeflistAddFail: function(timer, unlock, err) {
      window.clearTimeout(timer);
      timer = window.setTimeout(unlock, 2000);
      this.emit('command', 'alert', err.message);
    }
  });

  var RelatedVideoList = function() { this.initialize.apply(this, arguments); };
  _.extend(RelatedVideoList.prototype, VideoList.prototype);
  _.assign(RelatedVideoList.prototype, {
    update: function(listData, watchId) {
      //window.console.log('RelatedVideoList: ', listData, watchId);
      if (!this._view) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      listData.forEach(itemData => {
        if (!itemData.has_data) { return; }
        if (!itemData.id) { return; }
        items.push(new VideoListItem(itemData));
      });
      if (items.length < 1) { return; }
      //window.console.log('insertItem: ', items);
      this._model.insertItem(items);
      this._view.scrollTop(0);
    },
  });


  var PlaylistModel = function() { this.initialize.apply(this, arguments); };
  _.extend(PlaylistModel.prototype, VideoListModel.prototype);
  _.assign(PlaylistModel.prototype, {
    initialize: function() {
      this._maxItems = 10000;
      this._items = [];
      this._isUniq = true;

      this._boundOnItemUpdate = this._onItemUpdate.bind(this);
    },
  });

  var PlaylistView = function() { this.initialize.apply(this, arguments); };
  _.extend(PlaylistView.prototype, AsyncEmitter.prototype);
  PlaylistView.__css__ = (`

    .is-playlistEnable .tabSelect.playlist::after {
      content: '▶';
      color: #fff;
      text-shadow: 0 0 8px orange;
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .is-playlistEnable .tabSelect.playlist::after  {
      text-shadow: 0 0 8px #336;
    }

    .playlist-container {
      height: 100%;
      overflow: hidden;
    }

    .playlist-header {
      height: 32px;
      border-bottom: 1px solid #000;
      background: #333;
      color: #ccc;
    }

    .playlist-menu-button {
      cursor: pointer;
      border: 1px solid #333;
      padding: 0px 4px;
      margin: 0 4px;
      background: #666;
      font-size: 16px;
      line-height: 28px;
      white-space: nowrap;
    }
    .playlist-menu-button:hover {
      border: 1px outset;
    }
    .playlist-menu-button:active {
      border: 1px inset;
    }
    .playlist-menu-button .playlist-menu-icon {
      font-size: 24px;
      line-height: 28px;
    }

    .playlist-container.enable .toggleEnable,
    .playlist-container.loop   .toggleLoop {
      text-shadow: 0 0 6px #f99;
      color: #ff9;
    }

    .playlist-container .shuffle {
      font-size: 14px;
    }
    .playlist-container .shuffle::after {
      content: '(´・ω・｀)';
    }
    .playlist-container .shuffle:hover::after {
      content: '(｀・ω・´)';
    }

    .playlist-frame {
      height: calc(100% - 32px);
      transition: opacity 0.3s;
    }
    .shuffle .playlist-frame {
      opacity: 0;
    }

    .playlist-count {
      position: absolute;
      right: 8px;
      display: inline-block;
      font-size: 14px;
      line-height: 32px;
      cursor: pointer;
    }

    .playlist-count:before {
      content: '▼';
    }
    .playlist-count:hover {
      text-decoration: underline;
    }
    .playlist-menu {
      position: absolute;
      right: 0px;
      top: 24px;
      min-width: 150px;
      background: #333 !important;
    }

    .playlist-menu li {
      line-height: 20px;
      border: none !important;
    }

    .playlist-menu .separator {
      border: 1px inset;
      border-radius: 3px;
      margin: 8px 8px;
    }


    .playlist-file-drop {
      display: none;
      position: absolute;
      width: 94%;
      height: 94%;
      top: 3%;
      left: 3%;
      background: #000;
      color: #ccc;
      opacity: 0.8;
      border: 2px solid #ccc;
      box-shadow: 0 0 4px #fff;
      padding: 16px;
      z-index: 100;
    }

    .playlist-file-drop.show {
      /*display: block;*/
      opacity: 0.98 !important;
    }

    .playlist-file-drop.drag-over {
      box-shadow: 0 0 8px #fe9;
      background: #030;
    }

    .playlist-file-drop * {
      pointer-events: none;
    }

    .playlist-file-drop-inner {
      padding: 8px;
      height: 100%;
      border: 1px dotted #888;
    }

    .playlist-import-file-select {
      position: absolute;
      text-indent: -9999px;
      width: 100%;
      height: 20px;
      opacity: 0;
      cursor: pointer;
    }

  `).trim();
  PlaylistView.__tpl__ = (`
    <div class="playlist-container">
      <div class="playlist-header">
        <lavel class="playlist-menu-button toggleEnable playlist-command"
          data-command="toggleEnable"><icon class="playlist-menu-icon">▶</icon> 連続再生</lavel>
        <lavel class="playlist-menu-button toggleLoop playlist-command"
          data-command="toggleLoop"><icon class="playlist-menu-icon">&#8635;</icon> リピート</lavel>

        <div class="playlist-count playlist-command" data-command="toggleMenu">
          <span class="playlist-index"></span> / <span class="playlist-length"></span>
          <div class="zenzaPopupMenu playlist-menu">
            <div class="listInner">
            <ul>
              <li class="playlist-command" data-command="shuffle">
                シャッフル
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="postedAt">
                古い順に並べる
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="view:desc">
                再生の多い順に並べる
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="comment:desc">
                コメントの多い順に並べる
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="title">
                タイトル順に並べる
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="duration:desc">
                動画の長い順に並べる
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="duration">
                動画の短い順に並べる
              </li>

              <hr class="separator">
              <li class="playlist-command" data-command="exportFile">ファイルに保存 &#x1F4BE;</li>
              
              <li class="playlist-command" data-command="importFileMenu">
                <input type="file" class="playlist-import-file-select" accept=".json">
                ファイルから読み込む
              </li>

              <hr class="separator">
              <li class="playlist-command" data-command="resetPlayedItemFlag">すべて未視聴にする</li>
              <li class="playlist-command" data-command="removePlayedItem">視聴済み動画を消す ●</li>
              <li class="playlist-command" data-command="removeNonActiveItem">リストの消去 ×</li>

            </ul>
            </div>
          </div>
        </div>
      </div>
      <div class="playlist-frame"></div>
      <div class="playlist-file-drop">
        <div class="playlist-file-drop-inner">
          ファイルをここにドロップ
        </div>
      </div>
    </div>
  `).trim();

  _.assign(PlaylistView.prototype, {
    initialize: function(params) {
      this._$container = params.$container;
      this._model = params.model;
      this._playlist = params.playlist;


      ZenzaWatch.util.addStyle(PlaylistView.__css__);
      var $view = this._$view = $(PlaylistView.__tpl__);
      this._$container.append($view);

      this._$index  = $view.find('.playlist-index');
      this._$length = $view.find('.playlist-length');
      var $menu     = this._$menu = this._$view.find('.playlist-menu');
      var $fileDrop = this._$fileDrop = $view.find('.playlist-file-drop');
      var $fileSelect = this._$fileSelect = $view.find('.playlist-import-file-select');

      ZenzaWatch.debug.playlistView = this._$view;

      var listView = this._listView = new VideoListView({
        $container: this._$view.find('.playlist-frame'),
        model: this._model,
        className: 'playlist',
        dragdrop: true,
        dropfile: true,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });
      listView.on('command',    this._onCommand.bind(this));
      listView.on('deflistAdd', this._onDeflistAdd.bind(this));
      listView.on('moveItem', (src, dest) => { this.emit('moveItem', src, dest); });
      listView.on('filedrop', (data) => { this.emit('command', 'importFile', data); });
      listView.on('dblclick', this._onListDblclick.bind(this));

      this._playlist.on('update',
        _.debounce(this._onPlaylistStatusUpdate.bind(this), 100));

      this._$view.on('click', '.playlist-command', this._onPlaylistCommandClick.bind(this));
      ZenzaWatch.emitter.on('hideHover', function() {
        $menu.removeClass('show');
        $fileDrop.removeClass('show');
      });

      $('.zenzaVideoPlayerDialog')
        .on('dragover',  this._onDragOverFile .bind(this))
        .on('dragenter', this._onDragEnterFile.bind(this))
        .on('dragleave', this._onDragLeaveFile.bind(this))
        .on('drop',      this._onDropFile.bind(this));

      $fileSelect.on('change', this._onImportFileSelect.bind(this));

      _.each([
        'addClass',
        'removeClass',
        'scrollTop',
        'scrollToItem',
      ], (func) => {
        this[func] = listView[func].bind(listView);
      });
    },
    toggleClass: function(className, v) {
      this._view.toggleClass(className, v);
      this._$view.toggleClass(className, v);
    },
    _onCommand: function(command, param, itemId) {
      switch (command) {
        default:
          this.emit('command', command, param, itemId);
          break;
      }
    },
    _onDeflistAdd: function(watchId, itemId) {
      this.emit('deflistAdd', watchId, itemId);
    },
    _onPlaylistCommandClick: function(e) {
      var $target = $(e.target).closest('.playlist-command');
      var command = $target.attr('data-command');
      var param   = $target.attr('data-param');
      e.stopPropagation();
      if (!command) { return; }
      switch (command) {
        case 'importFileMenu':
          this._$menu.removeClass('show');
          this._$fileDrop.addClass('show');
          return;
        case 'toggleMenu':
          e.stopPropagation();
          e.preventDefault();
          this._$menu.addClass('show');
          return;
        case 'shuffle':
        case 'sortBy':
          var $view = this._$view;
          $view.addClass('shuffle');
          window.setTimeout(() => { this._$view.removeClass('shuffle'); }, 1000);
          this.emit('command', command, param);
          break;
        default:
          this.emit('command', command, param);
      }
      ZenzaWatch.emitter.emitAsync('hideHover');
    },
    _onPlaylistStatusUpdate: function() {
      var playlist = this._playlist;
      this._$view
        .toggleClass('enable', playlist.isEnable())
        .toggleClass('loop',   playlist.isLoop())
        ;
      this._$index.text(playlist.getIndex() + 1);
      this._$length.text(playlist.getLength());
    },
    _onDragOverFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$fileDrop.addClass('drag-over');
    },
    _onDragEnterFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$fileDrop.addClass('drag-over');
    },
    _onDragLeaveFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$fileDrop.removeClass('drag-over');
    },
    _onDropFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$fileDrop.removeClass('show drag-over');

      var file = e.originalEvent.dataTransfer.files[0];
      if (!/\.playlist\.json$/.test(file.name)) { return; }

      var fileReader = new FileReader();
      fileReader.onload = (ev) => {
        window.console.log('file data: ', ev.target.result);
        this.emit('command', 'importFile', ev.target.result);
      };

      fileReader.readAsText(file);
    },
    _onImportFileSelect: function(e) {
      e.preventDefault();

      var file = e.originalEvent.target.files[0];
      if (!/\.playlist\.json$/.test(file.name)) { return; }

      var fileReader = new FileReader();
      fileReader.onload = (ev) => {
        window.console.log('file data: ', ev.target.result);
        this.emit('command', 'importFile', ev.target.result);
      };

      fileReader.readAsText(file);

    },
    _onListDblclick: function(e) {
      e.stopPropagation();
      this.emit('command', 'scrollToActiveItem');
    }
  });

  var PlaylistSession = (function(storage) {
    var KEY = 'ZenzaWatchPlaylist';
    
    return {
      isExist: function() {
        var data = storage.getItem(KEY);
        if (!data) { return false; }
        try {
          JSON.parse(data);
          return true;
        } catch(e) {
          return false;
        }
      },
      save: function(data) {
        storage.setItem(KEY, JSON.stringify(data));
      },
      restore: function() {
        var data = storage.getItem(KEY);
        if (!data) { return null; }
        try {
          return JSON.parse(data);
        } catch(e) {
          return null;
        }
      }
    };
  })(sessionStorage);

  var Playlist = function() { this.initialize.apply(this, arguments); };
  _.extend(Playlist.prototype, VideoList.prototype);
  _.assign(Playlist.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;

      this._index = -1;
      this._isEnable = false;
      this._isLoop = params.loop;

      this._model = new PlaylistModel({});

      ZenzaWatch.debug.playlist = this;
      this.on('update', _.debounce(() => {
        var data = this.serialize();
        PlaylistSession.save(data);
      }, 3000));
    },
    serialize: function() {
      return {
        items: this._model.serialize(),
        index: this._index,
        enable: this._isEnable,
        loop: this._isLoop
      };
    },
    unserialize: function(data) {
      if (!data) { return; }
      this._initializeView();
      console.log('unserialize: ', data);
      this._model.unserialize(data.items);
      this._isEnable = data.enable;
      this._isLoop   = data.loop;
      this.emit('update');
      this.setIndex(data.index);
    },
    restoreFromSession: function() {
      this.unserialize(PlaylistSession.restore());
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new PlaylistView({
        $container: this._$container,
        model: this._model,
        playlist: this,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });
      this._view.on('command',    this._onCommand.bind(this));
      this._view.on('deflistAdd', this._onDeflistAdd.bind(this));
      this._view.on('moveItem',   this._onMoveItem.bind(this));
    },
    _onCommand: function(command, param, itemId) {
      var item;
      switch (command) {
        case 'toggleEnable':
          this.toggleEnable();
          break;
        case 'toggleLoop':
          this.toggleLoop();
          break;
        case 'shuffle':
          this.shuffle();
          break;
        case 'sortBy':
          var tmp = param.split(':');
          this.sortBy(tmp[0], tmp[1] === 'desc');
          break;
        case 'clear':
          this._setItemData([]);
          break;
        case 'select':
          item = this._model.findByItemId(itemId);
          this.setIndex(this._model.indexOf(item));
          this.emit('command', 'openNow', item.getWatchId());
          break;
        case 'playlistRemove':
          item = this._model.findByItemId(itemId);
          this._model.removeItem(item);
          this._refreshIndex();
          this.emit('update');
          break;
        case 'removePlayedItem':
          this.removePlayedItem();
          break;
        case 'resetPlayedItemFlag':
          this._model.resetPlayedItemFlag();
          break;
        case 'removeNonActiveItem':
          this.removeNonActiveItem();
          break;
        case 'exportFile':
          this._onExportFileCommand();
          break;
        case 'importFile':
          this._onImportFileCommand(param);
          break;
        case 'scrollToActiveItem':
          this.scrollToActiveItem();
          break;
        default:
          this.emit('command', command, param);
      }
    },
    _onExportFileCommand: function() {
      var dt = new Date();
      var title = prompt('プレイリストを保存\nプレイヤーにドロップすると復元されます', 
        util.dateToString(dt) + 'のプレイリスト');
      if (!title) { return; }

      var data = JSON.stringify(this.serialize());

      var blob = new Blob([data], { 'type': 'text/html' });
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.setAttribute('download', title + '.playlist.json');
      a.setAttribute('rel', 'noopener');
      a.setAttribute('href', url);
      document.body.appendChild(a);
      a.click();
      window.setTimeout(function() { a.remove(); }, 1000);
    },
    _onImportFileCommand: function(fileData) {
      if (!ZenzaWatch.util.isValidJson(fileData)) { return; }

      //this.emit('command', 'openNow', 'sm20353707');
      this.emit('command', 'pause');
      this.emit('command', 'notify', 'プレイリストを復元');
      this.unserialize(JSON.parse(fileData));

      ZenzaWatch.util.callAsync(function() {
        var index = Math.max(0, fileData.index || 0);
        var item = this._model.getItemByIndex(index);
        if (item) {
          this.setIndex(index, true);
          this.emit('command', 'openNow', item.getWatchId());
        }
      }, this, 2000);
    },
    _onMoveItem: function(srcItemId, destItemId) {
      var srcItem  = this._model.findByItemId(srcItemId);
      var destItem = this._model.findByItemId(destItemId);
      if (!srcItem || !destItem) { return; }
      var destIndex = this._model.indexOf(destItem);
      this._model.removeItem(srcItem);
      this._model.insertItem(srcItem, destIndex);
      this._refreshIndex();
    },
    _setItemData: function(listData) {
      var items = [];
      _.each(listData, function(itemData) {
        items.push(new VideoListItem(itemData));
      });
      //window.console.log('_setItemData', listData);
      this._model.setItem(items);
      this.setIndex(items.length > 0 ? 0 : -1);
    },
    _replaceAll: function(videoListItems, options) {
      options = options || {};
      this._model.setItem(videoListItems);
      var item = this._model.findByWatchId(options.watchId);
      if (item) {
        item.setIsActive(true);
        item.setIsPlayed(true);
        this._activeItem = item;
        setTimeout(() => { this._view.scrollToItem(item); }, 1000);
      }
      this.setIndex(this._model.indexOf(item));
    },
    _appendAll: function(videoListItems, options) {
      options = options || {};
      this._model.appendItem(videoListItems);
      var item = this._model.findByWatchId(options.watchId);
      if (item) {
        item.setIsActive(true);
        item.setIsPlayed(true);
        this._refreshIndex(false);
      }
      setTimeout(() => { this._view.scrollToItem(videoListItems[0]); }, 1000);
    },
    loadFromMylist: function(mylistId, options) {
      this._initializeView();

      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }
      window.console.time('loadMylist: ' + mylistId);

      return this._mylistApiLoader
        .getMylistItems(mylistId, options).then((items) => {
          window.console.timeEnd('loadMylist: ' + mylistId);
          var videoListItems = [];
          //var excludeId = /^(ar|sg)/; // nmは含めるべきかどうか
          items.forEach((item) => {
            // マイリストはitem_typeがint
            // とりまいはitem_typeがstringっていうね
            if (item.id === null) { return; } // ごく稀にある？idが抹消されたレコード
            if (item.item_data) {
              if (parseInt(item.item_type, 10) !== 0) { return; } // not video
              if (parseInt(item.item_data.deleted, 10) !== 0) { return; } // 削除動画を除外
            } else {
              //if (excludeId.test(item.id)) { return; } // not video
              if (item.thumbnail_url && item.thumbnail_url.indexOf('video_deleted') >= 0) { return; }
            }
            videoListItems.push(
              VideoListItem.createByMylistItem(item)
            );
          });

          //window.console.log('videoListItems!!', videoListItems);

          if (videoListItems.length < 1) {
            return Promise.reject({
              status: 'fail',
              message: 'マイリストの取得に失敗しました'
            });
          }
          if (options.shuffle) {
            videoListItems = _.shuffle(videoListItems);
          }

          if (!options.append) {
            this._replaceAll(videoListItems, options);
          } else {
            this._appendAll(videoListItems, options);
          }

          this.emit('update');
          return Promise.resolve({
            status: 'ok',
            message:
              options.append ?
                'マイリストの内容をプレイリストに追加しました' :
                'マイリストの内容をプレイリストに読み込みしました'
          });
        });
    },
    loadUploadedVideo: function(userId, options) {
      this._initializeView();

      if (!this._uploadedVideoApiLoader) {
        this._uploadedVideoApiLoader = new ZenzaWatch.api.UploadedVideoApiLoader();
      }

      window.console.time('loadUploadedVideos' + userId);

      return this._uploadedVideoApiLoader
        .getUploadedVideos(userId, options).then((items) => {
          window.console.timeEnd('loadUploadedVideos' + userId);
          var videoListItems = [];

          //var excludeId = /^(ar|sg)/; // nmは含めるべきかどうか
          items.forEach((item) => {
            if (item.item_data) {
              if (parseInt(item.item_type, 10) !== 0) { return; } // not video
              if (parseInt(item.item_data.deleted, 10) !== 0) { return; } // 削除動画を除外
            } else {
              //if (excludeId.test(item.id)) { return; } // not video
              if (item.thumbnail_url.indexOf('video_deleted') >= 0) { return; }
            }
            videoListItems.push(
              VideoListItem.createByMylistItem(item)
            );
          });

          if (videoListItems.length < 1) {
            return Promise.reject({});
          }

          // 投稿動画一覧は新しい順に渡されるので、プレイリストではreverse＝古い順にする
          videoListItems.reverse();
          if (options.shuffle) {
            videoListItems = _.shuffle(videoListItems);
          }
          //window.console.log('videoListItems!!', videoListItems);

          if (!options.append) {
            this._replaceAll(videoListItems, options);
          } else {
            this._appendAll(videoListItems, options);
          }

          this.emit('update');
          return Promise.resolve({
            status: 'ok',
            message:
              options.append ?
                '投稿動画一覧をプレイリストに追加しました' :
                '投稿動画一覧をプレイリストに読み込みしました'
          });
        });
    },
    loadSearchVideo: function(word, options, limit = 300) {
      this._initializeView();

      if (!this._searchApiLoader) {
        //this._nicoSearchApiLoader = ZenzaWatch.init.nicoSearchApiLoader;
        this._nicoSearchApiLoader = NicoSearchApiV2Loader;
      }

      window.console.time('loadSearchVideos' + word);
      options = options || {};

      return this._nicoSearchApiLoader
        .searchMore(word, options, limit).then((result) => {
          window.console.timeEnd('loadSearchVideos' + word);
          var items = result.list || [];
          var videoListItems = [];

          //var excludeId = /^(ar|sg)/; // nmは含めるべきかどうか
          items.forEach((item) => {
            if (item.item_data) {
              if (parseInt(item.item_type, 10) !== 0) { return; } // not video
              if (parseInt(item.item_data.deleted, 10) !== 0) { return; } // 削除動画を除外
            } else {
              //if (excludeId.test(item.id)) { return; } // not video
              if (item.thumbnail_url.indexOf('video_deleted') >= 0) { return; }
            }
            videoListItems.push(
              VideoListItem.createByMylistItem(item)
            );
          });

          if (videoListItems.length < 1) {
            return Promise.reject({});
          }

          if (options.playlistSort) {
            // 連続再生のために結果を古い順に並べる
            // 検索対象のソート順とは別
            videoListItems = _.sortBy(
              videoListItems,
              (item) => { return item.getPostedAt(); }
            );
            //videoListItems.reverse();
          }

          if (options.shuffle) {
            videoListItems = _.shuffle(videoListItems);
          }
          //window.console.log('videoListItems!!', videoListItems);

          if (!options.append) {
            this._replaceAll(videoListItems, options);
          } else {
            this._appendAll(videoListItems, options);
          }

          this.emit('update');
          return Promise.resolve({
            status: 'ok',
            message:
              options.append ?
                '検索結果をプレイリストに追加しました' :
                '検索結果をプレイリストに読み込みしました'
          });
        });
    },
    insert: function(watchId) {
      this._initializeView();
      if (this._activeItem && this._activeItem.getWatchId() === watchId) {
        return Promise.resolve();
      }

      var model = this._model;
      var index = this._index;
      return this._thumbInfoLoader.load(watchId).then((info) => {
        // APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
        // チャンネル動画はsoXXXXに統一したいのでvideoIdを使う. バッドノウハウ
        info.id = info.isChannel ? info.id : watchId;
        var item = VideoListItem.createByThumbInfo(info);
        //window.console.info(item, info);
        model.insertItem(item, index + 1);
        this._refreshIndex(true);

        this.emit('update');

        this.emit('command', 'notifyHtml',
          '次に再生: ' +
          '<img src="' + item.getThumbnail() + '" style="width: 96px;">' +
          item.getTitle()
        );
      },
      (result) => {
        var item = VideoListItem.createBlankInfo(watchId);
        model.insertItem(item, index + 1);
        this._refreshIndex(true);

        this.emit('update');

        window.console.error(result);
        this.emit('command', 'alert', '動画情報の取得に失敗: ' + watchId);
      });
    },
    insertCurrentVideo: function(videoInfo) {
      this._initializeView();

      if (this._activeItem &&
          !this._activeItem.isBlankData() &&
          this._activeItem.getWatchId() === videoInfo.watchId) {
        this._activeItem.updateByVideoInfo(videoInfo);
        this._activeItem.setIsPlayed(true);
        this.scrollToActiveItem();
        return;
      }

      var currentItem = this._model.findByWatchId(videoInfo.watchId);
      if (currentItem && !currentItem.isBlankData()) {
        currentItem.updateByVideoInfo(videoInfo);
        currentItem.setIsPlayed(true);
        this.setIndex(this._model.indexOf(currentItem));
        this.scrollToActiveItem();
        return;
      }

      var item = VideoListItem.createByVideoInfoModel(videoInfo);
      item.setIsPlayed(true);
      if (this._activeItem) { this._activeItem.setIsActive(false); }
      this._model.insertItem(item, this._index + 1);
      this._activeItem = this._model.findByItemId(item.getItemId());
      this._refreshIndex(true);
    },
    removeItemByWatchId: function(watchId) {
      var item = this._model.findByWatchId(watchId);
      if (!item || item.isActive()) { return; }
      this._model.removeItem(item);
      this._refreshIndex(true);
    },
    append: function(watchId) {
      this._initializeView();
      if (this._activeItem && this._activeItem.getWatchId() === watchId) { 
        return Promise.resolve();
      }

      var model = this._model;
      return this._thumbInfoLoader.load(watchId).then((info) => {
         // APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
        info.id = watchId;
        var item = VideoListItem.createByThumbInfo(info);
        //window.console.info(item, info);
        model.appendItem(item);
        this._refreshIndex();
        this.emit('update');
        this.emit('command', 'notifyHtml',
          'リストの末尾に追加: ' +
          '<img src="' + item.getThumbnail() + '" style="width: 96px;">' +
          item.getTitle()
        );
      },
      (result) => {
        var item = VideoListItem.createBlankInfo(watchId);
        model.appendItem(item);
        this._refreshIndex(true);
        this._refreshIndex();

        window.console.error(result);
        this.emit('command', 'alert', '動画情報の取得に失敗: ' + watchId);
      });
    },
    getIndex: function() {
      return this._activeItem ? this._index : -1;
    },
    setIndex: function(v, force) {
      v = parseInt(v, 10);
      //window.console.log('setIndex: %s -> %s', this._index, v);
      if (this._index !== v || force) {
        this._index = v;
        //window.console.log('before active', this._activeItem);
        if (this._activeItem) {
          this._activeItem.setIsActive(false);
        }
        this._activeItem = this._model.getItemByIndex(v);
        if (this._activeItem) {
          this._activeItem.setIsActive(true);
        }
        //window.console.log('after active', this._activeItem);
        this.emit('update');
      }
    },
    _refreshIndex: function(scrollToActive) {
      this.setIndex(this._model.indexOf(this._activeItem), true);
      if (scrollToActive) {
        setTimeout(() => {
          this.scrollToActiveItem();
        }, 1000);
      }
    },
    _setIndexByItemId: function(itemId) {
      var item = this._model.findByItemId(itemId);
      if (item) {
        this._setIndexByItem(item);
      }
    },
    _setIndexByItem: function(item) {
      var index = this._model.indexOf(item);
      if (index >= 0) {
        this.setIndex(index);
      }
    },
    getLength: function() {
      return this._model.getLength();
    },
    hasNext: function() {
      var len = this._model.getLength();
      return len > 0 && (this.isLoop() || this._index < len - 1);
    },
    isEnable: function() {
      return this._isEnable;
    },
    isLoop: function() {
      return this._isLoop;
    },
    toggleEnable: function(v) {
      if (!_.isBoolean(v)) {
        this._isEnable = !this._isEnable;
        this.emit('update');
        return;
      }

      if (this._isEnable !== v) {
        this._isEnable = v;
        this.emit('update');
      }
    },
    toggleLoop: function() {
      this._isLoop = !this._isLoop;
      this.emit('update');
    },
    shuffle: function() {
      this._model.shuffle();
      if (this._activeItem) {
        this._model.removeItem(this._activeItem);
        this._model.insertItem(this._activeItem, 0);
        this.setIndex(0);
      } else {
        this.setIndex(-1);
      }
      this._view.scrollTop(0);
    },
    sortBy: function(key, isDesc) {
      this._model.sortBy(key, isDesc);
      this._refreshIndex(true);
      ZenzaWatch.util.callAsync(function() {
        this._view.scrollToItem(this._activeItem);
      }, this, 1000);
    },
    removePlayedItem: function() {
      this._model.removePlayedItem();
      this._refreshIndex(true);
      ZenzaWatch.util.callAsync(function() {
        this._view.scrollToItem(this._activeItem);
      }, this, 1000);
    },
    removeNonActiveItem: function() {
      this._model.removeNonActiveItem();
      this._refreshIndex(true);
      this.toggleEnable(false);
    },
    selectNext: function() {
      if (!this.hasNext()) { return null; }
      var index = this.getIndex();
      var len = this.getLength();
      if (len < 1) { return null; }

      //window.console.log('selectNext', index, len);
      if (index < -1) {
        this.setIndex(0);
      } else if (index + 1 < len) {
        this.setIndex(index + 1);
      } else if (this.isLoop()) {
        this.setIndex((index + 1) % len);
      }
      return this._activeItem ? this._activeItem.getWatchId() : null;
    },
    selectPrevious: function() {
      var index = this.getIndex();
      var len = this.getLength();
      if (len < 1) { return null; }

      if (index < -1) {
        this.setIndex(0);
      } else if (index > 0) {
        this.setIndex(index - 1);
      } else if (this.isLoop()) {
        this.setIndex((index + len - 1) % len);
      } else {
        return null;
      }

      return this._activeItem ? this._activeItem.getWatchId() : null;
    },
    scrollToActiveItem: function() {
      if (this._activeItem) {
        this._view.scrollToItem(this._activeItem);
      }
    },
    scrollToWatchId: function(watchId) {
      var item = this._model.findByWatchId(watchId);
      if (item) {
        this._view.scrollToItem(item);
      }
    },
    findByWatchId: function(watchId) {
      return this._model.findByWatchId(watchId);
    }
  });

//===END===


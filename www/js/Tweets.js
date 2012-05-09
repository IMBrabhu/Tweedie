var FilteredTweetsModel = Model.create(
{
  uuid: Model.Property,
  title: Model.Property,
  name: Model.Property,
  canRemove: Model.Property,
  tweets: Model.Property,
  unread: Model.Property,
  velocity: Model.Property,
  lastRead: Model.Property,
  viz: Model.Property,

  constructor: function(__super, values)
  {
    var self = this;
    __super(values);
    self.tweets(new FilteredModelSet({ key: "id", limit: values.limit || 1000 }));
    self.unread(0);
    self.velocity(0);
    self._includeTags = [];
    self._excludeTags = [];
    self._account = values.account;
    self._tweetLists = values.account.tweetLists;
    self.viz(self.viz() || "list");
    self._removed = false;
  },

  restore: function(isNew)
  {
    return Co.Routine(this,
      function()
      {
        return isNew ? false : this._restore();
      },
      function(r)
      {
        r = r();
        this.updateUnreadAndVelocity();
        this.on("update.tweets update.includeTags update.excludeTags update.lastRead update.viz", function()
        {
          this._save();
        }, this);

        this._manageSearch();

        return r;
      }
    );
  },

  addTweets: function(tweets)
  {
    var ntweets;
    var otweets = this.tweets();
    if (otweets.length() === 0)
    {
      ntweets = tweets;
    }
    else
    {
      ntweets = [];
      tweets.forEach(function(twt)
      {
        if (!otweets.findByProperty("id", twt.id()))
        {
          ntweets.push(twt);
        }
      });
    }
    if (ntweets.length)
    {
      if (otweets.prepend(ntweets))
      {
        this.emit("update.tweets");
        this.emit("update");
      }
    }
  },

  removeTweets: function(ids)
  {
    if (ids.length)
    {
      var otweets = this.tweets();
      var rtweets = [];
      ids.forEach(function(id)
      {
        var tweet = otweets.findByProperty("id", id);
        if (tweet)
        {
          rtweets.push(tweet);
        }
      });
      if (rtweets.length)
      {
        if (otweets.remove(rtweets))
        {
          this.emit("update.tweets");
          this.emit("update");
        }
      }
    }
  },

  addIncludeTag: function(tag, refilter)
  {
    if (this._tagIndex(this._includeTags, tag) === -1)
    {
      var filter = this._makeRule(tag);
      this._includeTags.push({ tag: tag, filter: filter });
      this.tweets().addIncludeFilter(filter, refilter);
      this.emit("update.includeTags");
      this.emit("update");
    }
  },

  addExcludeTag: function(tag, refilter)
  {
    if (this._tagIndex(this._excludeTags, tag) === -1)
    {
      var filter = this._makeRule(tag);
      this._excludeTags.push({ tag: tag, filter: filter });
      this.tweets().addExcludeFilter(filter, refilter);
      this.emit("update.excludeTags");
      this.emit("update");
    }
  },

  removeIncludeTag: function(tag, refilter)
  {
    var idx = this._tagIndex(this._includeTags, tag);
    if (idx !== -1)
    {
      var e = this._includeTags.splice(idx, 1);
      this.tweets().removeIncludeFilter(e[0].filter, refilter);
      this.emit("update.includeTags");
      this.emit("update");
    }
  },

  removeExcludeTag: function(tag, refilter)
  {
    var idx = this._tagIndex(this._excludeTags, tag);
    if (idx !== -1)
    {
      var e = this._excludeTags.splice(idx, 1);
      this.tweets().removeExcludeFilter(e[0].filter, refilter);
      this.emit("update.excludeTags");
      this.emit("update");
    }
  },

  isSearch: function()
  {
    return this._isSearch;
  },

  _manageSearch: function()
  {
    this._isSearch = this.title().slice(-1) === "?";
    var nquery = this._isSearch ? this.title().slice(0, -1).toLowerCase() : null;
    if (this._searchQuery != nquery)
    {
      if (this._searchQuery)
      {
        this._account.removeSearch(this._searchQuery);
        this.tweets().removeExcludeFilter(this._searchExcludeFilter);
      }
      this._searchQuery = nquery;
      if (this._searchQuery)
      {
        var query = this._searchQuery;
        this._searchExcludeFilter = function(tweet)
        {
          return !tweet.match(query);
        };
        this.tweets().addExcludeFilter(this._searchExcludeFilter);
        this._account.addSearch(this._searchQuery);
      }
    }
  },

  isDM: function()
  {
    var tags = this.includeTags();
    return tags.length === 1 && tags[0].tag.type === Tweet.DMTag.type;
  },

  _tagIndex: function(list, tag)
  {
    for (var i = list.length - 1; i >= 0; i--)
    {
      if (list[i].tag.type === tag.type && list[i].tag.key === tag.key)
      {
        return i;
      }
    }
    return -1;
  },

  _makeRule: function(tag)
  {
    var key = tag.type + ":" + tag.key;
    return function(tweet)
    {
      return tweet.hasTagKey(key);
    };
  },

  _defaultAll: [{ tag: { title: "All", type: "default", key: "all", hashkey: "default:all" } }],
  _defaultNone: [{ tag: { title: "None", type: "default", key: "none", hashkey: "default:none" } }],

  includeTags: function()
  {
    return this._includeTags.length ? this._includeTags : this._defaultAll;
  },

  excludeTags: function()
  {
    return this._excludeTags.length ? this._excludeTags : this._defaultNone;
  },

  hotness: function()
  {
    var v = this.velocity();
    if (v === 0 || v === 1)
    {
      return 100;
    }
    else if (v > 0.5)
    {
      return 95;
    }
    else if (v > 0.1)
    {
      return 90;
    }
    else if (v > 0.05)
    {
      return 85;
    }
    else if (v > 0.01)
    {
      return 80;
    }
    else if (v > 0.005)
    {
      return 75;
    }
    else
    {
      return 50;
    }
  },

  markAllAsRead: function()
  {
    var last = this.tweets().models[0];
    this.lastRead((last && last.id()) || "0");
    this.updateUnreadAndVelocity();
  },

  updateUnreadAndVelocity: function()
  {
    this._updateUnread();
    this.recalcVelocity(this._tweetLists._getVelocity());
  },

  recalcVelocity: function(o)
  {
    this.velocity(this.unread() ? this.tweets().length() / o.maxLength : 0);
  },

  _updateUnread: function()
  {
    var id = this.lastRead();
    var tweets = this.tweets();
    var model = tweets.findByProperty("id", id);
    var i = model ? tweets.indexOf(model) : -1;
    if (i === -1)
    {
      var models = tweets.models;
      for (i = 0, len = models.length; i < len; i++)
      {
        if (Tweet.compareTweetIds(id, models[i].id()) <= 0)
        {
          break;
        }
      }
    }
    this.unread(i);
  },

  remove: function()
  {
    this._removed = true;
    this._account.preferences.removeAccountList(this.uuid());
    this.title("");
    this._manageSearch();
  },

  _save: function()
  {
    if (!this._removed)
    {
      this._updateUnread();
      this._account.preferences.setAccountList(this.uuid(),
      {
        includeTags: this._includeTags,
        excludeTags: this._excludeTags,
        lastRead: this.lastRead(),
        viz: this.viz(),
        tweets: this.tweets().serialize().map(function(tweet) { return tweet.id_str; })
      });
      this._manageSearch();
    }
  },

  _restore: function()
  {
    return Co.Routine(this,
      function()
      {
        return this._account.preferences.getAccountList(this.uuid());
      },
      function(vals)
      {
        vals = vals();
        this.delayUpdate(function()
        {
          this.viz(vals.viz || this.viz());
          var tweets = [];
          var lists = this._tweetLists;
          if (!vals._needRefresh)
          {
            (vals.tweets || []).forEach(function(id)
            {
              var tweet = lists.getTweet(id);
              if (tweet)
              {
                tweets.push(tweet);
              }
            }, this);
            this.addTweets(tweets);
          }
          this.lastRead(vals.lastRead || "0");
          (vals.includeTags || []).forEach(function(t)
          {
            this.addIncludeTag(t.tag, false);
          }, this);
          (vals.excludeTags || []).forEach(function(t)
          {
            this.addExcludeTag(t.tag, false);
          }, this);
        });
        return vals._needRefresh || false;
      }
    );
  },

  refresh: function()
  {
    return Co.Routine(this,
      function()
      {
        return this._account.preferences.getAccountList(this.uuid());
      },
      function(vals)
      {
        vals = vals();
        this.delayUpdate(function()
        {
          this.viz(vals.viz || this.viz());
          this.lastRead(vals.lastRead || "0");
          var diff = this._calcTagDiff(this._includeTags || [], vals.includeTags || []);
          diff.add.forEach(function(t)
          {
            this.addIncludeTag(t.tag, false);
          }, this);
          diff.remove.forEach(function(t)
          {
            this.removeIncludeTag(t.tag, false);
          }, this);
          diff = this._calcTagDiff(this._excludeTags || [], vals.excludeTags || []);
          diff.add.forEach(function(t)
          {
            this.addExcludeTag(t.tag, false);
          }, this);
          diff.remove.forEach(function(t)
          {
            this.removeExcludeTag(t.tag, false);
          }, this);
        });
        return true;
      }
    );
  },

  _calcTagDiff: function(oldTags, newTags)
  {
    var diff =
    {
      add: [],
      remove: []
    };
    newTags.forEach(function(t)
    {
      if (this._tagIndex(oldTags, t.tag) === -1)
      {
        diff.add.push(t);
      }
    }, this);
    oldTags.forEach(function(t)
    {
      if (this._tagIndex(newTags, t.tag) === -1)
      {
        diff.remove.push(t);
      }
    }, this);
    return diff;
  }
});

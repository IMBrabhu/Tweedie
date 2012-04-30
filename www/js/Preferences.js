var Preferences = Class(Events,
{
  constructor: function(base)
  {
    this._base = base;
    this._grid = grid.get();
    if (typeof SyncStorage !== "undefined")
    {
      this._sync = SyncStorage;
      var self = this;
      document.addEventListener("syncstoragechange", function(evt)
      {
        Log.info("syncstoragechange event: " + JSON.stringify(evt.detail));
        evt.detail.keys.forEach(function(key)
        {
          Log.info("Sync key change: " + key);
          if (key === this._base + "/lists")
          {
            // List have changed.
            this.emit("listsChange");
          }
          else if (key.indexOf(this._base + "/") === 0)
          {
            // List contents changed.
            this.emit("listChange", { uuid: key.slice(this._base.length + 1) });
          }
          else if (key === "/accounts")
          {
            // Ignore for now
          }
          else
          {
            Log.info("Unknown sync key change: " + key);
          }
        }, self);
      });
    }
    else
    {
      this._sync = 
      {
        set: function() {},
        get: function(_,cb) { cb(null); },
        remove: function() {}
      };
    }
  },

  getAccounts: function()
  {
    return Co.Routine(this,
      function()
      {
        return this._sync.get("/accounts", Co.Callback(this, function(val)
        {
          return val;
        }));
      },
      function(r)
      {
        r = r();
        return r ? r : this._grid.read("/accounts");
      }
    );
  },

  setAccounts: function(accounts)
  {
    this._grid.write("/accounts", accounts);
    this._sync.set("/accounts", accounts);
    return true;
  },

  getAccountSet: function()
  {
    var data;
    return Co.Routine(this,
      function(r)
      {
        return this._grid.read(this._base);
      },
      function(r)
      {
        data = r() || {};
        this._sync.get(this._base + "/lists", Co.Callback(this, function(lists)
        {
          return lists;
        }));
      },
      function(lists)
      {
        lists = lists();
        if (lists)
        {
          data.lists = lists;
        }
        return data;
      }
    );
  },

  setAccountSet: function(data)
  {
    this._grid.write(this._base, data);
    this._sync.set(this._base + "/lists", data.lists);
    return true;
  },

  getAccountList: function(uuid)
  {
    var id = this._base + "/" + uuid;
    var data;
    return Co.Routine(this,
      function()
      {
        return this._sync.get(id, Co.Callback(this, function(val)
        {
          return val;
        }));
      },
      function(r)
      {
        data = r();
        return this._grid.read(id);
      },
      function(r)
      {
        r = r() || {};
        if (!data)
        {
          data = r;
        }
        else
        {
          data.tweets = r.tweets;
          if (JSON.stringify(data.includeTags) !== JSON.stringify(r.includeTags) ||
              JSON.stringify(data.excludeTags) !== JSON.stringify(r.excludeTags))
          {
            data._needRefresh = true;
          }
        }
        return data;
      }
    );
  },

  setAccountList: function(uuid, data)
  {
    var id = this._base + "/" + uuid;
    this._grid.write(id, data);
    var sdata = {};
    for (var k in data)
    {
      sdata[k] = data[k];
    }
    delete sdata.tweets; // We dont sync the tweets (just too many)
    this._sync.set(id, sdata);
    return true;
  },

  removeAccountList: function(uuid)
  {
    var id = this._base + "/" + uuid;
    this._sync.remove(id);
    return this._grid.remove(id);
  }
});

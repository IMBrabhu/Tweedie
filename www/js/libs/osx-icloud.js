var SyncStorage =
{
  _null: function()
  {
  },

  get: function(key, callback)
  {
    window.ICloud.getCloudValue__(key, function(str)
    {
      Log.info("Sync: get: " + key + " -> " + str);
      callback(str === null ? null : JSON.parse(str));
    });
  },

  set: function(key, value, callback)
  {
    window.ICloud.setCloudValue_forKey__(value === undefined || value === null ? null : JSON.stringify(value, function(k, v)
    {
      return k[0] === "_" ? undefined : v; // Don't include 'private' keys
    }), key, callback || this._null);
  },

  remove: function(key, callback)
  {
    window.ICloud.removeCloudValue__(key, callback || this._null);
  },

  getAll: function(callback)
  {
    window.ICloud.getCloudKeyValues_(function(dict)
    {
      for (var key in dict)
      {
        dict[key] = dict[key] === null ? null : JSON.parse(dict[key]);
      }
      callback(dict);
    });
  }
};
document.addEventListener("DOMContentLoaded", function()
{
  window.ICloud.registerCloudCallback_(function(key)
  {
    var e = document.createEvent("CustomEvent");
    e.initCustomEvent("syncstoragechange", true, true, { keys: [ key ] });
    document.dispatchEvent(e);
  });
});

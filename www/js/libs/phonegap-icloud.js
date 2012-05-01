var SyncStorage =
{
  get: function(key, callback)
  {
    PhoneGap.exec(function(str)
    {
      callback(str === null ? null : JSON.parse(str));
    }, null, "ICloudPlugin", "get", [ key ]);
  },

  set: function(key, value, callback)
  {
    PhoneGap.exec(callback, null, "ICloudPlugin", "set", [ key, value === undefined || value === null ? null : JSON.stringify(value, function(k, v)
    {
      return k[0] === "_" ? undefined : v; // Don't include 'private' keys
    }) ]);
  },

  remove: function(key, callback)
  {
    PhoneGap.exec(callback, null, "ICloudPlugin", "remove", [ key ]);
  },

  getAll: function(callback)
  {
    PhoneGap.exec(function(dict)
    {
      for (var key in dict)
      {
        dict[key] = dict[key] === null ? null : JSON.parse(dict[key]);
      }
      callback(dict);
    }, null, "ICloudPlugin", "getKeyValues", null);
  }
};
document.addEventListener("deviceready", function()
{
  PhoneGap.exec(function(keys)
  {
    var e = document.createEvent("CustomEvent");
    e.initCustomEvent("syncstoragechange", true, true, { keys: keys });
    document.dispatchEvent(e);
  }, null, "ICloudPlugin", "registerCallback", []);
});

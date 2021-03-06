import m from "mithril";

const Notifications = {
  list: [],
  subs: [],

  load: () => {
    return m.request({
      method: "GET",
      url: "/api/notifs"
    }).then(result => {
      Notifications.list = result
    });
  },

  loadSubs: () => {
    return m.request({
      method: "GET",
      url: "/api/notifs/subs"
    }).then(result => {
      Notifications.subs = result
    });
  },

  markRead: (id) => {
    return m.request({
      method: "POST",
      url: `/api/notifs/${id}/read`
    }).then(result => {
      Notifications.load();
    });
  },
};

export default Notifications

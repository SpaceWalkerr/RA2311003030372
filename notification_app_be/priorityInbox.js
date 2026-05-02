const typePriority = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function compareNotifications(a, b) {
  const aPriority = typePriority[a.Type] || 0;
  const bPriority = typePriority[b.Type] || 0;

  if (aPriority !== bPriority) {
    return bPriority - aPriority;
  }

  return new Date(b.Timestamp) - new Date(a.Timestamp);
}

function getTopNotifications(notifications, limit = 10) {
  return notifications
    .slice()
    .sort(compareNotifications)
    .slice(0, limit)
    .map((item) => ({
      id: item.ID,
      type: item.Type,
      message: item.Message,
      timestamp: item.Timestamp,
      priority: typePriority[item.Type] || 0,
    }));
}

module.exports = {
  getTopNotifications,
};

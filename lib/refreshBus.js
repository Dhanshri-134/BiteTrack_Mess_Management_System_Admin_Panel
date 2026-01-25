let refreshing = false;

export const triggerRefresh = () => {
  refreshing = true;
  window.dispatchEvent(new Event("APP_REFRESH"));

  // auto-reset after short time
  setTimeout(() => {
    refreshing = false;
  }, 3000);
};

export const isRefreshing = () => refreshing;

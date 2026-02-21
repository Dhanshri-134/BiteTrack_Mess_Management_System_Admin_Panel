let refreshing = false;

export const triggerRefresh = () => {
  refreshing = true;
  window.dispatchEvent(new Event("APP_REFRESH"));


};

export const isRefreshing = () => refreshing;

export const resetRefresh = () => {
  refreshing = false;
};
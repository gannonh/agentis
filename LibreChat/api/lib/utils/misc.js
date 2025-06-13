const cleanUpPrimaryKeyValue = (value) => {
  // For Bing convoId handling
  return value.replace(/--/g, '|');
};

export { cleanUpPrimaryKeyValue };

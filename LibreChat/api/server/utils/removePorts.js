export default (req) => req?.ip?.replace(/:\d+[^:]*$/, '');

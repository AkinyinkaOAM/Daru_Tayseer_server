const getRequestUser = (req) => {
  if (!req.user) {
    return 'anonymous';
  }

  return req.user.email || req.user.id || req.user._id || 'authenticated-user';
};

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const user = getRequestUser(req);

    console.log(
      `[REQUEST] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms ip=${req.ip} user=${user}`
    );
  });

  next();
};

module.exports = requestLogger;
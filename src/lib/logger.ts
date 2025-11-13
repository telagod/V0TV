type LogArgs = unknown[];

const isDev = () => process.env.NODE_ENV !== 'production';

const createLogger =
  (writer: (...args: LogArgs) => void) =>
  (...args: LogArgs) => {
    if (!isDev()) return;
    writer(...args);
  };

export const logInfo = createLogger((...args) => {
  // eslint-disable-next-line no-console
  console.log(...args);
});

export const logWarn = createLogger((...args) => {
  // eslint-disable-next-line no-console
  console.warn(...args);
});

export const logError = createLogger((...args) => {
  // eslint-disable-next-line no-console
  console.error(...args);
});

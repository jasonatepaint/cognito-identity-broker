import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';

dayjs.extend(duration);
dayjs.extend(utc);

export const ttlFromMinutes = (minutesToLive= 0) =>
	dayjs.utc().add(minutesToLive, "minute").unix();


export { dayjs };

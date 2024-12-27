export function formatDuration(durationInMilliseconds: number): string {
    const seconds = Math.floor((durationInMilliseconds / 1000) % 60);
    const minutes = Math.floor((durationInMilliseconds / (1000 * 60)) % 60);
    const hours = Math.floor((durationInMilliseconds / (1000 * 60 * 60)) % 24);

    const hoursFormat = hours < 10 ? "0" + hours : hours;
    const minutesFormat = minutes < 10 ? "0" + minutes : minutes;
    const secondsFormat = seconds < 10 ? "0" + seconds : seconds;

    return `${hoursFormat}:${minutesFormat}:${secondsFormat}`;
}
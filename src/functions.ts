export function durationToMS(duration: string): number | null {
    let timeRegex = /([0-9]+(m($| )|min($| )|mins($| )|minute($| )|minutes($| )|h($| )|hr($| )|hrs($| )|hour($| )|hours($| )|d($| )|day($| )|days($| )|wk($| )|wks($| )|week($| )|weeks($| )|mth($| )|mths($| )|month($| )|months($| )|y($| )|yr($| )|yrs($| )|year($| )|years($| )))+/gmi
    let durationMS = 0;
    let durationArr = duration.match(timeRegex);
    if (!durationArr) return null;
    durationArr.forEach((d) => {
        let time = d.match(/[0-9]+/gmi);
        let unit = d.match(/[a-zA-Z]+/gmi);
        if (!time || !unit) return;
        let timeNum = parseInt(time[0]);
        let unitNum = 0;
        switch (unit[0].toLowerCase()) {
            case 'm':
            case 'min':
            case 'mins':
            case 'minute':
            case 'minutes':
                unitNum = 60000;
                break;
            case 'h':
            case 'hr':
            case 'hrs':
            case 'hour':
            case 'hours':
                unitNum = 3600000;
                break;
            case 'd':
            case 'day':
            case 'days':
                unitNum = 86400000;
                break;
            case 'wk':
            case 'wks':
            case 'week':
            case 'weeks':
                unitNum = 604800000;
                break;
            case 'mth':
            case 'mths':
            case 'month':
            case 'months':
                unitNum = 2592000000;
                break;
            case 'y':
            case 'yr':
            case 'yrs':
            case 'year':
            case 'years':
                unitNum = 31536000000;
                break;
        }
        durationMS += timeNum * unitNum;
    })
    return durationMS;
};
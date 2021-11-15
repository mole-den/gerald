import NodeCache from "node-cache";
import { db } from './index'
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

class Cache {
    cache: NodeCache;
    constructor(ttlSeconds: number) {
        this.cache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: ttlSeconds * 0.2, useClones: false });
    }

    async get(guild: string, type: string): Promise<any> {
        let key = `${guild}-${type}`
        const value = this.cache.get(key) as string;
        if (value) {
            return Promise.resolve(value);
        }
        let data = await db.query('SELECT $1 FROM guilds WHERE guildid = $2', [type, guild])
        if (data.rowCount === 0) throw new Error(`No data found in database for guild ${guild}`);
        this.cache.set(key, data.rows[0]);
        return Promise.resolve(data.rows[0]);
    };
    async change(guild: string, type: string, input: any): Promise<any> {
        await db.query("UPDATE guilds SET $1 = $2 WHERE guildid = $3", [type, input, guild]);
        let x = await db.query("SELECT * FROM guilds WHERE guildid = $1", [guild]);
        this.cache.set(`${guild}-${type}`, x.rows[0]);
        return;
    }
}

export const guildDataCache = new Cache(1800)


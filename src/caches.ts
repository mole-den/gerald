import NodeCache from 'node-cache';
import { prisma } from './index';

export class membersCache {
	private readonly ttlSeconds: number
	cache: NodeCache
	constructor(ttlSeconds: number) {
		this.ttlSeconds = ttlSeconds;
		this.cache = new NodeCache({
			stdTTL: this.ttlSeconds,
			checkperiod: this.ttlSeconds * 0.2,
			useClones: false
		});
		prisma.guild.findMany().then((output) => {
			output.forEach(async (row) => {
				let x = await prisma.member.findMany({where: {guild: row.guildId}})
				this.cache.set(`${row.guildId}`, x.map(x => x.userid.toString()));
			})
		})
	}
	async validate(guild: string, users: string | Array<string>, checkOnly: boolean = false): Promise<boolean | Array<boolean>> {
		let x = <Array<string>>this.cache.get(guild);
		if ((typeof users === 'string') && x.includes(users)) return true;
		else if (typeof users === 'string') {
			if (checkOnly) return false
			await prisma.member.createMany({
				data: {
					guild: guild,
					userid: users
				},
				skipDuplicates: true
			})
			return true;
		}
		else {
			if (checkOnly) {
				let res: Array<boolean> = [];
				users.forEach((user) => {
					if (!x.includes(user)) {
						if (checkOnly) res.push(false);
					} else {
						if (checkOnly) res.push(true);
					}
				})
				return res	
			}
			let query: Array<{
				guild: string,
				userid: string
			}> = users.map((u) => {
				return {
					userid: u,
					guild: guild
				}
			})
			await prisma.member.createMany({
				data: query,
				skipDuplicates: true,
			})
			return true
		}
	}

	async add(guild: string) {
		let x = await prisma.member.findMany({
			select: {
				userid: true
			},
			where: {
				guild: guild
			}
		})
		this.cache.set(`${guild}`, x.map(x => x.userid.toString()));
	}
}

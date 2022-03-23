import NodeCache from 'node-cache';
import { prisma } from '.';
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
	}
	async create(guildid: string) {
		let members = (await prisma.member.findMany({
			where: {
				guildid: guildid
			},
			select: {
				userid: true
			}
		})).map(i => i.userid)
		this.cache.set(guildid, members)
		return members
	}
	async validate(guild: string, users: string | Array<string>, checkOnly: boolean = false): Promise<boolean | Array<boolean>> {
		let x = (this.cache.get(guild) as string[] | undefined) ?? await this.create(guild);
		if (typeof users === 'string') {
			if (x.includes(users)) return true
			if (checkOnly) return false
			await prisma.member.create({
				data: {
					guildid: guild,
					userid: users
				}
			})
			return true;
		} else {
			if (checkOnly) {
				let res: Array<boolean> = [];
				users.forEach((user) => {
					if (!(user in x)) {
						res.push(false);
					} else {
						res.push(true);
					}
				})
				return res
			}
			await prisma.member.createMany({
				data: users.map((u) => {
					return {
						userid: u,
						guildid: guild
					}
				}),
				skipDuplicates: true,
			})
			return true
		}
	}

}
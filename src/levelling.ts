import { prisma, bot, getRandomArbitrary } from ".";
import { RateLimiterMemory } from "rate-limiter-flexible"
export function runLevelling() {
    const xpLimit = new RateLimiterMemory({
        points: 100,
        duration: 60
    })
    bot.on("messageCreate", async (message) => {
        if (message.author.bot) return
        console.log("a")
        if (!message.guild) return
        let x = await prisma.member_level.findUnique({
            where: {
                memberID_guildID: {
                    memberID: message.author.id,
                    guildID: message.guildId!
                }
            }
        })
        if (!x) x = await prisma.member_level.create({
            data: {
                memberID: message.author.id,
                guildID: message.guildId!,
            }
        })
        let add = getRandomArbitrary(1, 4)
        try {
            xpLimit.consume(`${message.guildId}-${message.author.id}`, add)
        } catch (error) {
            return
        }
        x.xp = x.xp + add
        if (x.xp >= x.nextLevelXp) {
            x.level++
            x.nextLevelXp = Math.round(100 * ((1 + 0.15) ** x.level))
            message.channel.send(``)
        }
        await prisma.member_level.update({
            where: {
                memberID_guildID: {
                    memberID: message.author!.id,
                    guildID: message.guildId!
                },
            },
            data: {
                level: x.level,
                nextLevelXp: x.nextLevelXp,
                xp: x.xp
            }
        })
    })

}

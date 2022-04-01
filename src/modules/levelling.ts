import { prisma, bot, getRandomArbitrary, } from "..";
import { RateLimiterMemory } from "rate-limiter-flexible"
import { Module, settings } from "../commandClass";
import * as discord from "discord.js";
export class Levelling extends Module {
    xpLimit: RateLimiterMemory | undefined
    declare settings: settings.Setting[]
    constructor() {
        super({
            name: "levelling",
            description: "Levelling",
            settings: [{
                id: "levelUpMsg",
                name: "Message sent on level up",
                type: "string",
                description: "Message sent when a user levels up. Use `{{user}}` to mention the user and `{{level}}` to get the user's new level.",
                default: "{{user}} is now level {{level}}."
            }, {
                id: "levelUpMsgType",
                name: "Level up message type",
                description: "Type of message sent when a user levels up. Can be a message in the server or a dm.",
                default: "Server",
                type: "choice",
                choices: ["Server", "DM"]
            }]
        })
    }

    async handler(message: discord.Message) {
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
            this.xpLimit!.consume(`${message.guildId}-${message.author.id}`, add)
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
    }
    async load(): Promise<void> {
        this.xpLimit = new RateLimiterMemory({
            points: 30,
            duration: 60
        })
        bot.on("messageCreate", x => this.handler(x))

    }
    async unload(): Promise<void> {
        bot.off("messageCreate", x => this.handler(x))
    }
}

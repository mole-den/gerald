import * as sapphire from '@sapphire/framework';
import * as discord from 'discord.js';
import { SubCommandPluginCommand } from '@sapphire/plugin-subcommands';
import { durationToMS, guildDataCache, db, getRandomArbitrary } from '../index';
import * as lux from 'luxon';
import * as voice from '@discordjs/voice';
import { join } from 'path'
voice
let permissionsPrecondition = (...args: discord.PermissionResolvable[]) => {
    let preconditionArray: Array<sapphire.PreconditionEntryResolvable> = [];
    preconditionArray.push('override')
    args.forEach((item) => {
        preconditionArray.push(new sapphire.UserPermissionsPrecondition(item))
    });
    return preconditionArray
};


export class testCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'test',
            description: 'short desc',
            detailedDescription: 'desc displayed when help command is called',
            requiredClientPermissions: [],
            preconditions: [],
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        return;
        let x = <discord.VoiceChannel>await message.guild?.channels.fetch(args.next());
        if (message.member?.voice.channel === null) return;
        let voiceChannel = x;
        const connection = voice.joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });
        const audioPlayer = voice.createAudioPlayer();
        audioPlayer.play(voice.createAudioResource(join(__dirname, 'video0.mp3')));
        connection.subscribe(audioPlayer);
    };
}

export class ownerDisableCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'dismount',
            description: 'Disables a command globally',
            requiredClientPermissions: [],
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let cmd = args.nextMaybe();
        if (!cmd.exists) return
        let command = this.container.stores.get('commands').find(value => value.name === cmd.value);
        if (!command) return message.channel.send('Command not found');
        command.enabled = false;
        return message.channel.send(`Dismounted *${cmd.value}*`);
    };
}

export class ownerEnableCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'mount',
            description: 'Enables a command globally',
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let cmd = args.next();
        let command = this.container.stores.get('commands').find(value => value.name === cmd);
        if (!command) return message.channel.send('Command not found');
        command.enabled = true;
        command.reload();
        return message.channel.send(`Mounted *${cmd}*`);
    };
};

export class ownerEvalCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'eval',
            description: 'Evaluates JS input',
            requiredClientPermissions: [],
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message) {
        let str = message.content;
        let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
        try {
            eval(out);
        } catch (error) {
            console.log("error");
            console.log(error);
            message.channel.send(`Unhandled exception: \n ${error}`);
        }
    };
};

export class DeletedMSGCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'deleted',
            description: '',
            requiredClientPermissions: [],
            preconditions: [permissionsPrecondition('MANAGE_MESSAGES'), 'GuildOnly']
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let arg = args.nextMaybe();
        if (!arg.exists) return message.channel.send('Please specify amount of messages to view.');
        let amount = parseInt(arg.value);
        if (isNaN(amount)) return message.channel.send('Please specify a valid amount of messages to view.');
        let del = await db.query('SELECT * FROM deletedmsgs WHERE guildid=$2 ORDER BY msgtime DESC LIMIT $1;',
            [amount, message.guildId]);
        del.rows.forEach(async (msg) => {
            if (msg.content.length > 1028) {
                var content: string = msg.content.substring(0, 1025) + '...';
            } else {
                var content: string = msg.content;
            }
            const DeleteEmbed = new discord.MessageEmbed()
                .setTitle("Deleted Message")
                .setColor("#fc3c3c")
                .addField("Author", `<@${msg.author}>`, true)
                .addField("Deleted By", msg.deleted_by, true)
                .addField("Channel", `<#${msg.channel}>`, true)
                .addField("Message", content || "None")
                .setFooter(`Message ID: ${msg.msgid} | Author ID: ${msg.author}`);
            message.channel.send({
                embeds: [DeleteEmbed]
            })
        });
        return;
    };

};

export class smiteCommand extends SubCommandPluginCommand {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'smite',
            description: '',
            requiredClientPermissions: ['BAN_MEMBERS'],
            preconditions: [permissionsPrecondition('BAN_MEMBERS'), 'GuildOnly'],
            subCommands: ['add', 'remove', 'list', 'clear', { input: 'add', default: true }]

        });
    };

    public async add(message: discord.Message, args: sapphire.Args) {
        let user = await args.pick('member').catch(() => {
            return args.pick('user')
        })
        let content = await args.pick('string').catch(() => null);
        let reason = await args.repeat('string').catch(() => null);
        let time = content !== null ? durationToMS(content) : null;
        if (time === null) {
            if (content !== null && reason !== null) reason.unshift(content)
        };
        let strReason = reason === null ? 'not given' : reason?.join(' ');
        let endsDate = (time !== null) ? new Date(Date.now() + time) : null;
        if (user instanceof discord.GuildMember) {
            if (message.member!.roles.highest.comparePositionTo(user.roles.highest) <= 0 && (message.guild!.ownerId !== message.member!.id)) {
                message.channel.send(`You do not have a high enough role to do this.`);
                return;
            }
            if (!user.bannable) {
                return message.channel.send("This user is not bannable by the bot.");
            }
            await db.query(`INSERT INTO punishments (member, guild, type, reason, created_time, ends) VALUES ($1, $2, $3, $4, $5, $6) `,
                [user.id, message.guild!.id, 'blist', strReason, new Date(), endsDate]);
            message.guild!.bans.create(user, { reason: strReason, days: 0 });
            message.channel.send(`${user.user.username} has been added to the blacklist and banned${(time === null) ? '.' : `for ${content}`}\nProvided reason: ${strReason}`);
        } else {
            await db.query(`INSERT INTO punishments (member, guild, type, reason, created_time, ends) VALUES ($1, $2, $3, $4, $5, $6) `,
                [user.id, message.guild!.id, 'blist', strReason, new Date(), endsDate]);
            message.channel.send(`${user.username} has been added to the blacklist and banned${(time === null) ? '.' : `for ${content}`}\nProvided reason: ${strReason}`);
        };
        return;
    }

    public async remove(message: discord.Message, args: sapphire.Args) {
        let user = await args.pick('user')
        let q = await db.query('SELECT * FROM punishments WHERE type=\'blist\' AND member = $2 AND guild = $1', [user.id, message.guild!.id]);
        if (q.rowCount === 0) return;
        await message.guild!.members.unban(user).catch(() => { })
        db.query('UPDATE punishments SET resolved = true WHERE type=\'blist\' AND member = $2 AND guild = $1', [user.id, message.guild!.id]);
        message.channel.send(`${user.username} has been removed from the blacklist`);
    }

    public async list(message: discord.Message) {
        let smite = await db.query(`SELECT * FROM punishments WHERE type='blist' AND guild = $1 AND NOT RESOLVED`, [message.guild!.id]);
        if (smite.rowCount === 0) message.channel.send(`No users are blacklisted`);
        smite.rows.forEach(async (i) => {
            let x = await message.client.users.fetch(i.member);
            let date = i.ends ? (+new Date(i.ends) - Date.now()) : null;
            let duration = date === null ? 'permanently' : `for ${lux.Duration.fromMillis(date!)}`;
            message.channel.send(`**${x.username}#${x.discriminator}** is blacklisted until *${duration}*. Case ID: ${i.id}`);
        });
    }
    public async reset(message: discord.Message) {
        let banned = await db.query(`SELECT * FROM punishments WHERE type='blist' AND guild = $1 AND NOT RESOLVED`, [message.guild!.id]);
        await db.query('UPDATE punishments SET resolved = true WHERE type=\'blist\' AND guild = $1', [message.guild!.id]);
        message.channel.send(`The blacklist has been cleared`);
        banned.rows.forEach((i) => {
            message.guild!.members.unban(i.userid).catch((err) => {
                console.log(err)
            })
        });
    }
}

export class queryCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'query',
            description: 'Runs SQL input against database',
            requiredClientPermissions: [],
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message) {
        let str = message.content;
        let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
        if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
            message.channel.send('You do not have permission to do this');
            return;
        }
        let data = await db.query(out);
        let JSONdata = JSON.stringify(data.rows, null, 1);
        if (JSONdata?.length && JSONdata.length < 2000) {
            message.channel.send(`${data.command} completed - ${data.rowCount} rows, \n${JSONdata}`);
            return;
        } else if (JSONdata?.length && JSONdata.length > 2000) {
            const buffer = Buffer.from(JSONdata)
            const attachment = new discord.MessageAttachment(buffer, 'file.json');
            message.channel.send(`${data.command} completed - ${data.rowCount} rows,`);
            message.channel.send({ files: [attachment] });
        } else {
            message.channel.send(`${data.command} completed - ${data.rowCount} rows,`);
        }

    };

};

export class prefixCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'prefix',
            description: 'Shows prefix',
            requiredClientPermissions: [],
            preconditions: ['GuildOnly', permissionsPrecondition('ADMINISTRATOR')]
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let x = args.next()
        guildDataCache.change(message.guild!.id, 'prefix', x);
        message.channel.send(`Changed prefix for ${message.guild!.name} to ${x}`);
    }
}

export class sirmoleCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'sirmole',
            description: 'unfunny',
            requiredClientPermissions: [],
            preconditions: []
        });
    };
    public async messageRun(message: discord.Message) {
        message.channel.send('sir mole is unfunny')
    }
}

export class dieCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'die',
        });
    };
    public async messageRun(message: discord.Message) {
        message.channel.send(`no u`);
    }
}

export class politicsCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'politics',
        });
    };
    public async messageRun(message: discord.Message) {
        message.channel.send(`https://cdn.discordapp.com/attachments/377228302336655362/886234477578301490/video0.mp4`);
    }
}

export class repoCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'repo',
        });
    };
    public async messageRun(message: discord.Message) {
        message.channel.send(`https://github.com/mole-den/Gerald`);
    }
}

export class inviteCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'invite',
        });
    };
    public async messageRun(message: discord.Message) {
        message.channel.send(`https://discord.com/oauth2/authorize?client_id=671156130483011605&scope=bot&permissions=829811966`);
    }
}

export class uptimeCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'uptime',
        });
    };
    public async messageRun(message: discord.Message) {
        let uptime = process.uptime();
        let uptimeString = "";
        if (uptime >= 86400) {
            uptimeString += Math.floor(uptime / 86400) + " days ";
            uptime %= 86400;
        }
        if (uptime >= 3600) {
            uptimeString += Math.floor(uptime / 3600) + " hours ";
            uptime %= 3600;
        }
        if (uptime >= 60) {
            uptimeString += Math.floor(uptime / 60) + " minutes ";
            uptime %= 60;
        }
        uptimeString += Math.floor(uptime) + " seconds";
        message.channel.send(`Uptime: ${uptimeString}`);
    }
}

export class pingCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'ping',
        });
    };
    public async messageRun(message: discord.Message) {
        let start = Date.now()
        await db.query('select 1;')
        let elapsed = Date.now() - start
        message.channel.send(`Websocket heartbeat: ${message.client.ws.ping}ms \nDatabase heartbeat: ${elapsed}ms`)
    }
}

export class statusCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'status',
        });
    };
    public async messageRun(message: discord.Message) {
        let user = message.mentions.users.first()
        if (user) {
            let member = await message.guild?.members.fetch(user);
            if (member && member.presence) {
                let presence = member.presence.activities.filter(x => x.type === "PLAYING");
                let x = "";
                if (presence[0]) x = `Playing **${presence[0].name}**`;
                let status = (member.id !== "536047005085204480") ? member.presence.status : "cringe";
                message.channel.send(`${(member.nickname || user.username)} is ${status}\n${x}`);
            }
        }
    }
}

export class setstatusCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'setstatus',
            preconditions: ['OwnerOnly']
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let stat = args.next();
        if (stat === 'online' || stat === 'idle' || stat === 'dnd' || stat === 'invisible') {
            message.client.user!.setStatus(stat);
        };
        const activity = args.next()
        if (activity === 'playing' || activity === 'streaming' || activity === 'watching' || activity === 'listening' || activity === 'none') {
            let stat = (activity === 'none') ? undefined : <discord.ActivityType>activity.toUpperCase();
            let name = (await args.repeat('string')).join(' ');
            message.client.user!.setActivity(name, { type: (stat as any) });
            return;
        };
    }
}

export class setupCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'setup',
        });
    };
    public async messageRun(message: discord.Message) {
        message.channel.send(`Beginning setup but no because zac cant code`);
    }
}

export class sexCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'sex'
        });
    };
    public async messageRun(message: discord.Message) {
        if (getRandomArbitrary(1, 50) === 22) {
            let msg = discord.Util.splitMessage(`
It was a wonderful monday morning... 
BigUniverse got out of bed and immediatly grabbed his phone to talk to his wonderful boyfriend, Gustavo. He messaged him, "Squish me daddy!!!"
Unfortunately, Gustavo had greater plans then going over to BigUniverse's house and railing him. Gustavo wanted a better boyfriend.
He had been programming an AI that would function as a boyfriend for him, but he did not have a body for it. He messaged BigUniverse,
"Im sorry but I dont think we can continue this relationship."
BigUniverse was distraught. He replied, "I will 1v1 you in minecraft bedwars!"
But nothing could change this. Gustavo would date a robot.
If u want more, dm me :)
-sirmole
		`);
            msg.forEach(x => message.channel.send(x));
            return
        }

        let msg = discord.Util.splitMessage(`
No. You aren't having this.
But... you can have this https://www.youtube.com/watch?v=k4FF7x8vnZg&t=0s&ab_channel=Hepburn
		`);
        msg.forEach(x => message.channel.send(x));
    }
};

export class helpCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'help',
        });
    };
    public async messageRun(message: discord.Message) {
        message.channel.send('Hello! I am Gerald. I will enable you to take control of your server by my rules >:)');
    }
}

export class guildsCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'guilds',
        });
    };
    public async messageRun(message: discord.Message) {
        let x = await message.client.guilds.fetch();
        x.each((a) => { message.channel.send(`In guild '${a.name}'', (${a.id})'\n Owner is ${a.owner}`) });
    }
}


export class gayCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'gay',
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let cmd = args.next()
        if (cmd === 'add') {
            let change = (await args.repeat('string')).join(' ')
            await db.query('UPDATE members SET sexuality=$1 WHERE userid = $2',
                [change, message.author.id]);
            message.channel.send(`set ${message.author.username} to ${change}`);
            return;
        }
        message.mentions.members?.each(async (eachmem) => {
            let s = await db.query('SELECT * FROM members WHERE userid = $1', [BigInt(eachmem.id)])
            message.channel.send(`${(eachmem.nickname !== null) ? eachmem.nickname : eachmem.user.username} is ${s.rows[0].sexuality}`);
        })
        message.mentions.roles?.each(async (eachrole) => {
            eachrole.members.each(async (eachmem) => {
                let s = await db.query('SELECT * FROM members WHERE userid = $1', [BigInt(eachmem.id)])
                message.channel.send(`${(eachmem.nickname !== null) ? eachmem.nickname : eachmem.user.username} is ${s.rows[0].sexuality}`);
            })
            
        })
    }
}


export class askCommand extends sapphire.Command {
    constructor(context: sapphire.PieceContext, options: sapphire.CommandOptions | undefined) {
        super(context, {
            ...options,
            name: 'ask',
        });
    };
    public async messageRun(message: discord.Message, args: sapphire.Args) {
        let opt = args.nextMaybe()
        if (opt.exists && opt.value === 'users') {
            let y = await message.guild?.roles.fetch('858473576335540224');
            let i = await message.guild?.roles.fetch('877133047210852423');
            if (!y) return;
            if (!i) return;
            let member: Array<discord.GuildMember> = []
            y.members.each((mem) => member.push(mem));
            i.members.each((mem) => member.push(mem));
            let uniq = [...new Set(member)];
            let x = await args.pick('number');
            if (x > 10) return
            for (let i = 0; i < x; i++) {
                let ask = uniq[getRandomArbitrary(0, member.length - 1)]
                    await message.channel.send(`${(ask.nickname !== null) ? ask.nickname : ask.user.username}`);
            }
            return
        } else if (opt.exists && opt.value === 'user') {
            let y = await message.guild?.roles.fetch('858473576335540224');
            let i = await message.guild?.roles.fetch('877133047210852423');
            if (!y) return;
            if (!i) return;
            let member: Array<discord.GuildMember | string> = []
            y.members.each((mem) => member.push(mem));
            i.members.each((mem) => member.push(mem));
            member.push('nobody');
            let uniq = [...new Set(member)];
            let ask = uniq[getRandomArbitrary(0, member.length - 1)]
            if (typeof ask === 'string') {
                message.channel.send(`${ask}`);
                return
            }
            await message.channel.send(`${(ask.nickname !== null) ? ask.nickname : ask.user.username}`);
            return;
        }
        else if (opt.exists && opt.value === 'percent') {
            message.channel.send(`${getRandomArbitrary(0, 100)}%`);
            return;
        }
        if (getRandomArbitrary(0, 20) > 9) {
            message.channel.send('yes');
        } else {
            message.channel.send('no');
        }

    }
}

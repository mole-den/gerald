const Discord = require('discord.js');
const bot = new Discord.Client();
const version = "0.2";
const commandPrefix = "!i";
const HypixelAPI = require('hypixel-api')
 
const client = new HypixelAPI('83318b25-4540-4efb-a744-62b9eacc20fe')
 
client.getPlayer('name', 'ZacIsBurnt').then((player) => {
    console.log(player)
}).catch((err) => {
    console.error('Error! ' + err)
})

bot.on('ready', () => {
    bot.user.setStatus('available') // Can be 'available', 'idle', 'dnd', or 'invisible'
    bot.user.setPresence({
        game: {
            name: 'PRAISE GERALD',
            type: 2
        }
    });
});   


const token = 'NjcxMTU2MTMwNDgzMDExNjA1.XjPKHQ.-rzIx_kQPWdYf3umABay0DqyaDA';

bot.on('ready', () =>{
    console.log('Preparing to take over the world...');
    console.log('World domination complete.');
    console.log('ONLINE');
   // Client.guilds.get("576344535622483968").channels.get("588221105710432286").send("Hello there.")
})

bot.on('message', msg=>{
    switch(msg.content){
//-----------------------No prefix commands here------------------------------------
        case "HELLO":
            msg.reply('HELLO FRIEND'); 
            break;
        case "Bonjour":
            msg.reply('i like french bread');
            break;
        case "SHould toast rob no?":
            msg.reply('no');
            break;
             case "Bonjour":
            msg.reply('i like french bread');
            break;
        case "Gerald":
            msg.reply('that is me');
            break;
        case "PRAISE GERALD":
             msg.reply('Yes');
            break;
            case "ÞĬļɶɫʋʑʕ":
                msg.reply('ÞĬļɶɫʋʑʕ');
                console.log('Potat Ritual complete!');
               break;
        case "hi":
            msg.reply('Why hello there.');
            break;
         case "NI":
            msg.channel.sendMessage('NI');
            console.log('NI');
            break;
        case "ÝƏƏ":
            msg.reply('ÝƏƏ');
            console.log('Ascension Ritual complete!');
            break;
//--------------------------------End no prefix commands here---------------------------------
        default:
            checkCommand(msg);
            break;
    }
})


bot.login(token);

function checkCommand(msg){
    try{
        if(msg.content.startsWith(commandPrefix)){
            var command = msg.content.replace(commandPrefix, '');
            switch(command){
//-----------------------Prefix commands here------------------------------------
                case "invite":
                    msg.channel.sendMessage('Add me to your server with https://discordapp.com/oauth2/authorize?client_id=671156130483011605&scope=bot&permissions=8');
                break;
                case "ledie":
                    throw "You broke it, good job.";
                break;
                case "admin":
                    msg.channel.sendMessage('ACCESS DENIED');
                break;
                case "backflip":
                    msg.channel.sendMessage('**does a backflip**');
                break;
                case "emerald":
                    msg.channel.sendMessage('Zac currently has mined **197764** emeralds! (20/5/2020) Check his status for his position.');
                break;
                case "help":
                    msg.channel.sendMessage('The link to join my creators discord is https://discord.gg/Y2EtATM');
                    msg.channel.sendMessage('Invite me with https://discordapp.com/oauth2/authorize?client_id=671156130483011605&scope=bot&permissions=8');
                break;
                case "flicker":
                    msg.channel.sendMessage('The link to join my creators discord is https://discord.gg/Y2EtATM');
                break;
//--------------------------------End prefix commands, unknown command below-----------------------------
                default:
                    msg.channel.sendMessage('Unknown command!');
                    console.log('Oh no. Somebody cant english!')
                break;
            }
        }
    } catch (e){
        msg.channel.sendMessage('Error!');
        msg.channel.sendMessage('Error code: ' + Math.floor(Math.random() * 999 + 1));
        msg.channel.sendMessage(e);
        console.log('ERROR')
    }
    
}

//-----------------------Custom functions here------------------------------------
function randomnumber(msg){
    msg.channel.sendMessage(Math.floor(Math.random() * 10 + 1));
}


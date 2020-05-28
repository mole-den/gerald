const Discord = require('discord.js');
const bot = new Discord.Client();
const commandPrefix = "!i";
const wikiPrefix = "gwiki ";
const emerald = "224644";
const date = "27/5/2020"

bot.on('ready', () => {
    bot.user.setStatus('available') // Can be 'available', 'idle', 'dnd', or 'invisible'
    bot.user.setPresence({
        game: {
            name: 'PRAISE GERALD',
            type: 2
        }
    });
});   


const token = 'NjcxMTU2MTMwNDgzMDExNjA1.Xs9tTw.QOJZky89ROAnBWYiu1l9EDhk8q4';

bot.on('ready', () =>{
    console.log('Preparing to take over the world...');
    console.log('World domination complete.');
    console.log('ONLINE');
    //console.log(`Logged in as ${client.user.tag}!`);
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
        case "Should toast rob no?":
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
                console.log('dafaq');
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
            console.log('dafaq');
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
                case "donatebread":
                    msg.channel.sendMessage('Thankyou for your contribution!');
                    console.log('Bread shipment inbound!');
                break;
                case "emerald":
                    msg.channel.sendMessage('Zac currently has mined **' + emerald + '** emeralds! (' + date + ') Check his status for his position.');
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


//----------Wiki------------------------
bot.on('message', msg=>{
    switch(msg.content){
        case wikiPrefix + "Harvester":
            msg.reply('gwiki: Harvester Upgrades'); 
            msg.channel.sendMessage('Once a great spud farmer decided he was tired of farming spuds by hand so he invented a Harvester that would do it for him.');
            msg.channel.sendMessage('Harvester I: 100 Spudcoin || 100 Spudcoin per hour');
            msg.channel.sendMessage('Harvester II: 1000 Spudcoin || 200 Spudcoin per hour');
            msg.channel.sendMessage('Harvester III: 10k Spudcoin || 300 Spudcoin per hour');
            msg.channel.sendMessage('Harvester IV: 100k Spudcoin || 400 Spudcoin per hour');
            msg.channel.sendMessage('Harvester V: 500k Spudcoin || 500 Spudcoin per hour');
            msg.channel.sendMessage('Harvester VI: 1M Spudcoin || 1k Spudcoin per hour to bank');
            break;
        case wikiPrefix + "Mastery":
            msg.reply('gwiki: Mastery Upgrades'); 
            msg.channel.sendMessage('Once, one farmer decended so far into potato madness he crossed the threshold of potatification. He then brought back these upgrades.');
            msg.channel.sendMessage('Mastery I: Acquired from giveaways || 10k Spudcoin per hour');
            msg.channel.sendMessage('Mastery II: 5M || 50k Spudcoin per hour');
            msg.channel.sendMessage('Mastery III: 100M || 1M Spudcoin per hour to bank');
            msg.channel.sendMessage('Mastery IV: !B || 10M Spudcoin per hour to bank');
            break;
         case wikiPrefix + "Spudcoin":
            msg.reply('gwiki: Spudcoin'); 
            msg.channel.sendMessage('The strange spud currency of Project Flicker.');
            break;
            
        default:
            checkCommand(msg);
            break;
    }
})

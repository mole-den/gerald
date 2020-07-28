const Discord = require('discord.js');
const bot = new Discord.Client();
const commandPrefix = "g";
const wikiPrefix = "gwiki ";
const emerald = "555477";
const ice = "e";
const date = "23/6/2020"

/*bot.on('ready', () => {
    bot.user.setStatus('available') // Can be 'available', 'idle', 'dnd', or 'invisible'
    bot.user.setPresence({
        game: {
            name: 'PRAISE GERALD', //do that
            type: 2
        }
    });
});   */


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
            channel.send('NI');
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
                    msg.channel.sendMessage('no');
                break;

//--------------------------------End prefix commands, unknown command below-----------------------------
                default:
                    msg.channel.sendMessage('wat');
                    console.log('Oh no. Somebody cant english!')
                break;
            }
        }
    } catch (e){
        channel.send('Error!');
        channel.send('Error code: ' + Math.floor(Math.random() * 999 + 1));
        channel.send(e);
        console.log('ERROR')
    }
    
}

//-----------------------Custom functions here------------------------------------
function randomnumber(msg){
    channel.send(Math.floor(Math.random() * 10 + 1));
}


//----------Wiki and new commands------------------------
bot.on('message', msg=>{
    switch(msg.content){
        case wikiPrefix + "Harvester":
            channel.send('gwiki: Harvester Upgrades'); 
            channel.send('Once a great spud farmer decided he was tired of farming spuds by hand so he invented a Harvester that would do it for him.');
            channel.send('(Harvester I: 100 Spudcoin | 100 Spudcoin per hour) -> (Harvester II: 1000 Spudcoin | 200 Spudcoin per hour) -> (Harvester III: 10k Spudcoin | 300 Spudcoin per hour) -> (Harvester IV: 100k Spudcoin | 400 Spudcoin per hour) -> (Harvester V: 500k Spudcoin | 500 Spudcoin per hour) -> (Harvester VI: 1M Spudcoin | 1k Spudcoin per hour to bank) -> (Harvester VII: Buy from the Strange Auction | ???)');
            break;
        case wikiPrefix + "Mastery":
            channel.send('gwiki: Mastery Upgrades (outdated)'); 
            channel.send('Once, one farmer decended so far into potato madness he crossed the threshold of potatification. He then brought back these upgrades.');
            channel.send('(Mastery I: From Giveaways | 10k per hour) -> (Mastery II: 5M | 50k per hour) -> (Mastery III: 100M | 1M per hour to bank) -> (Mastery IV: 1000000000 | 10M per hour to bank)');
            channel.send('lol this is outdated');
            break;
         case wikiPrefix + "Valuable Spuds":
            channel.send('gwiki: Valuable Spuds (outdated)'); 
            channel.send('MUST. HAVE. SHINY. SPUDS.');
            channel.send('(Valuable Spuds I: 10M | 100k per hour) -> (Valuable Spuds II: 30M | 500k per hour) -> (Valuable Spuds III: 100M | 1M per hour)');
            break;
         case wikiPrefix + "Spudcoin":
            channel.send('gwiki: Spudcoin'); 
            channel.send('The strange spud currency of Project Flicker.');
            break;
         case wikiPrefix + "Midas Spuds":
            channel.send('gwiki: Midas Spuds'); 
            channel.send('probably does nothing (Price: 1B)');
            break;
         case wikiPrefix + "God of Spuds":
            channel.send('gwiki: God of Spuds'); 
            channel.send('After maxing out every other upgrade, a farmer must take on a final task: to become a god of spuds.');
            channel.send('10B | 100M per hour to bank');
            break;
         case wikiPrefix + "Reboots":
            channel.send('gwiki: Server Reboots'); 
            channel.send('Every once in a while, the server undergoes a cosmetic change called a reboot. During a reboot, farmers may sacrifice all their spudcoin and gameplay roles (not Eternal Service) to get a Rebooted item. Farmers keep their inventory when they reboot.');
            break;
         case wikiPrefix + "Luck":
            channel.send('gwiki: Luck'); 
            channel.send('amazing WIP');
            channel.send('u can get from sweden querst and shop and other stuff');
            break;
         case wikiPrefix + "Strange Auction":
            channel.send('gwiki: Strange Auction');
            channel.send("get lot monez to buy stuf");
	 	    //commands are good
	 case commandPrefix + "flicker":
	    channel.send('Yës Brøthër');
	    //channel.send(Pfembed);
	    channel.send('https://discord.gg/Y2EtATM');
	 case commandPrefix + "help":
	    channel.send('no');
	    break;
	 case commandPrefix + "errortest":
	    throw ":(";
	    break;
        default:
            checkCommand(msg);
            break;
    }
})

/*const PFembed = new Discord.MessageEmbed()
	.setColor('#31ef01')
	.setTitle('Project Flicker [test]')
	.setURL('https://discord.js.org/')
	.setAuthor('Some name', 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
	.setDescription('Some description here')
	.setThumbnail('https://i.imgur.com/wSTFkRM.png')
	//.addFields(
	//	{ name: 'Regular field title', value: 'Some value here' },
	//	{ name: '\u200B', value: '\u200B' },
	//	{ name: 'Inline field title', value: 'Some value here', inline: true },
	//	{ name: 'Inline field title', value: 'Some value here', inline: true },
	//)
	.addField('Inline field title', 'Some value here', true)
	.setImage('https://i.imgur.com/wSTFkRM.png')
	.setTimestamp()
	.setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');*/





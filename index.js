const Discord = require('discord.js');
const bot = new Discord.Client();
const commandPrefix = "g";
const wikiPrefix = "gwiki ";
const emerald = "555477";
const ice = "e";
const date = "23/6/2020"

bot.on('ready', () => {
    bot.user.setStatus('available') // Can be 'available', 'idle', 'dnd', or 'invisible'
    bot.user.setPresence({
        game: {
            name: 'PRAISE GERALD', //do that
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
            channel.send('HELLO FRIEND'); 
            break;
        case "Bonjour":
            channel.send('i like french bread');
            break;
        case "Bonjour":
            channel.send('i like french bread');
            break;
        case "Gerald":
            channel.send('that is me');
            break;
        case "PRAISE GERALD":
             channel.send('do that');
            break;
         case "ÞĬļɶɫʋʑʕ":
             console.log('dafaq');
            break;
        case "hi":
            channel.send('Why hello there.');
            break;
         case "NI":
            channel.send('no');
            console.log('NI');
            break;
        case "ÝƏƏ":
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
	 	    //commands are good
	 case commandPrefix + "flicker":
	    channel.send('Yës Brøthër');
	    //channel.send(Pfembed);
	    channel.send('https://discord.gg/Y2EtATM');
	    break;
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





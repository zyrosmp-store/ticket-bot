require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const commands = [
  new SlashCommandBuilder().setName('setup-ticket-panel').setDescription('Post the ticket creation panel').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('close-ticket').setDescription('Close the current ticket').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
].map(c => c.toJSON());
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) throw new Error('Fill in DISCORD_TOKEN, CLIENT_ID, and GUILD_ID in .env');
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
  .then(() => console.log('Ticket bot slash commands registered.'))
  .catch(console.error);

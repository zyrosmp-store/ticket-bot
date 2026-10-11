require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, Events } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
function makeTicketMenu() {
  const menu = new StringSelectMenuBuilder().setCustomId('ticket-type').setPlaceholder('Select a ticket type...').addOptions(Object.entries(ticketTypes).map(([value, t]) => ({ label: t.label, value, emoji: t.emoji, description: value === 'giveaway_claim' ? 'Claim a giveaway prize' : `Open a ${t.label.toLowerCase()} ticket` })));
  return new ActionRowBuilder().addComponents(menu);
}
const ticketTypes = {
  support_ticket: { label: 'Support Ticket', emoji: '🎫' },
  giveaway_claim: { label: 'Giveaway Claim Ticket', emoji: '🎁' }
};
client.once(Events.ClientReady, c => console.log(`Ticket bot online as ${c.user.tag}`));
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup-ticket-panel') {
        const embed = new EmbedBuilder().setColor(0x8b35ff).setTitle('🎟️ Need help? Create a ticket!').setDescription('Choose one of the options below to open a private ticket.\n\n🎫 **Support Ticket** — get help from the staff team.\n🎁 **Giveaway Claim Ticket** — claim a prize you won in a community giveaway.').setFooter({ text: 'Streamer Community • Support' });
        await interaction.channel.send({ embeds: [embed], components: [makeTicketMenu()] });
        return interaction.reply({ content: 'Ticket panel posted.', ephemeral: true });
      }
      if (interaction.commandName === 'close-ticket') {
        if (!interaction.channel.topic?.includes('ticket-owner:')) return interaction.reply({ content: 'Use this command inside a ticket channel.', ephemeral: true });
        await interaction.reply({ content: `Ticket closed by ${interaction.user.tag}. This channel will be deleted in 5 seconds.` });
        const logId = process.env.TICKET_LOG_CHANNEL_ID;
        if (logId) { const log = interaction.guild.channels.cache.get(logId); if (log) await log.send(`🔒 **Ticket closed:** ${interaction.channel.name} by ${interaction.user.tag}`); }
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      }
    }
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-type') {
      // Reset the public panel immediately so it never remains visually stuck on a previous selection.
      await interaction.update({ components: [makeTicketMenu()] });
      const type = ticketTypes[interaction.values[0]];
      const existing = interaction.guild.channels.cache.find(ch => ch.type === ChannelType.GuildText && ch.topic?.startsWith(`ticket-owner:${interaction.user.id} | type:`));
      if (existing) return interaction.followUp({ content: `You already have an open ticket: ${existing}`, ephemeral: true });
      const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 16) || 'member';
      const overwrites = [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles] }
      ];
      if (process.env.STAFF_ROLE_ID) overwrites.push({ id: process.env.STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
      const ticketSlugs = { support_ticket: 'support-ticket', giveaway_claim: 'giveaway-claim' };
      const ticketSlug = ticketSlugs[interaction.values[0]] || interaction.values[0].replace(/_/g, '-');
      const options = { name: `${ticketSlug}-${safeName}`.slice(0, 90), type: ChannelType.GuildText, topic: `ticket-owner:${interaction.user.id} | type:${type.label}`, permissionOverwrites: overwrites };
      const channel = await interaction.guild.channels.create(options);
      const embed = new EmbedBuilder().setColor(0x8b35ff).setTitle(`${type.emoji} ${type.label}`).setDescription(`Hello ${interaction.user}! Please describe what you need help with.\n\nA staff member will be with you shortly. Do not share passwords or private account details.`).setFooter({ text: `Opened by ${interaction.user.tag}` });
      const close = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close-ticket-button').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger));
      await channel.send({ content: process.env.STAFF_ROLE_ID ? `<@&${process.env.STAFF_ROLE_ID}> New ticket opened by ${interaction.user}.` : `New ticket opened by ${interaction.user}.`, embeds: [embed], components: [close], allowedMentions: { users: [interaction.user.id], roles: process.env.STAFF_ROLE_ID ? [process.env.STAFF_ROLE_ID] : [] } });
      await interaction.followUp({ content: `Your ticket has been created: ${channel}`, ephemeral: true });
    }
    if (interaction.isButton() && interaction.customId === 'close-ticket-button') {
      if (!interaction.channel.topic?.includes('ticket-owner:')) return interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
      await interaction.reply({ content: `Ticket closed by ${interaction.user.tag}. Deleting in 5 seconds.` });
      const logId = process.env.TICKET_LOG_CHANNEL_ID;
      if (logId) { const log = interaction.guild.channels.cache.get(logId); if (log) await log.send(`🔒 **Ticket closed:** ${interaction.channel.name} by ${interaction.user.tag}`); }
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  } catch (err) { console.error(err); if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Something went wrong. Check the bot console and permissions.', ephemeral: true }).catch(() => {}); }
});
if (!process.env.DISCORD_TOKEN) throw new Error('Missing DISCORD_TOKEN in .env');
client.login(process.env.DISCORD_TOKEN);

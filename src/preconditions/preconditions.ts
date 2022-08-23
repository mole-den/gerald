import { Precondition, PreconditionOptions} from "@sapphire/framework";
import { Interaction } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

@ApplyOptions<PreconditionOptions>({
	name: "OwnerOnly",
})
export class OwnerOnlyCondition extends Precondition {
	public async chatInputRun(interaction: Interaction)     {
		return ((process.env.OWNERS ?? " ").split(" ").includes(interaction.user.id)) ? this.ok()
			: this.error({ message: "This command is owner only.", context: { silent: true } });
	}
}
declare module "@sapphire/framework" {
    interface Preconditions {
        OwnerOnly: never;
    }
}
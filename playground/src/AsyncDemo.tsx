import { Mentions, type MentionItem } from "@skyastrall/mentions-react";

export function AsyncDemo({ users }: { users: MentionItem[] }) {
	const fetchUsers = async (query: string): Promise<MentionItem[]> => {
		await new Promise((r) => setTimeout(r, 800));
		return users.filter((u) => u.label.toLowerCase().includes(query.toLowerCase()));
	};

	return (
		<section>
			<h2>Async data with loading state</h2>
			<p className="desc">Simulates 800ms API call. Shows "Loading..." in dropdown.</p>
			<Mentions
				triggers={[{ char: "@", data: fetchUsers, debounce: 300 }]}
				placeholder="Type @ and wait for async results..."
			/>
		</section>
	);
}


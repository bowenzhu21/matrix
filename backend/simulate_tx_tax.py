import asyncio
import httpx
import json
import os
import random

def planner_chat_endpoint_for(base_or_endpoint: str) -> str:
    trimmed = (base_or_endpoint or "").strip().rstrip("/")
    if not trimmed:
        return ""
    if trimmed.endswith("/v1/chat/completions"):
        return trimmed
    return f"{trimmed}/v1/chat/completions"

# Single entry point for your Modal containers (override with env vars).
DEFAULT_MODAL_BASE = "https://aryan-cs--deepseek-r1-32b-openai-server.modal.run"
RAW_MODAL_ENDPOINT = (
    os.getenv("SIM_MODAL_ENDPOINT")
    or os.getenv("MODAL_ENDPOINT")
    or os.getenv("VITE_PLANNER_MODEL_ENDPOINT")
    or DEFAULT_MODAL_BASE
)
MODAL_ENDPOINT = planner_chat_endpoint_for(RAW_MODAL_ENDPOINT)

async def call_agent_llm(agent_id, system_prompt, incoming_message):
    # Extract first name so we can explicitly ban third-person self-reference
    first_name = agent_id
    if "You are " in system_prompt:
        full_name = system_prompt.split("You are ", 1)[1].split(",")[0].strip()
        first_name = full_name.split()[0]

    payload = {
        "model": "deepseek-r1",
        "messages": [
            {"role": "system", "content": (
                f"{system_prompt}\n\n"
                f"You must speak as {first_name} in first person ('I', 'me', 'my'). "
                f"Never write '{first_name}' or refer to yourself by name. "
                f"Never narrate. Respond in 1-2 sentences."
            )},
            {
                "role": "user",
                "content": f"Your neighbor just said: \"{incoming_message}\""
            }
        ],
        "temperature": 0.9,
        "max_tokens": 1024  # needs room to finish <think> block + give actual reply
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(MODAL_ENDPOINT, json=payload)
            content = resp.json()["choices"][0]["message"]["content"]
            # Strip the <think> reasoning block — only pass the actual reply forward
            if "</think>" in content:
                content = content.split("</think>", 1)[1].strip()
            else:
                # Model ran out of tokens inside the think block — retry once with a nudge
                payload["messages"].append({"role": "assistant", "content": content})
                payload["messages"].append({"role": "user", "content": "Just say your reaction in 1-2 sentences."})
                payload["max_tokens"] = 80
                resp2 = await client.post(MODAL_ENDPOINT, json=payload)
                content = resp2.json()["choices"][0]["message"]["content"]
                if "</think>" in content:
                    content = content.split("</think>", 1)[1].strip()
            return content.strip()
        except Exception as e:
            return f"[{agent_id} unavailable: {str(e)}]"

async def run_simulation(num_seeds=2, max_depth=3):
    # 1. Load the social graph from your network builder's output
    try:
        with open("graph.json", "r") as f:
            graph = json.load(f)
    except FileNotFoundError:
        print("❌ Error: graph.json not found. Run your curl command first to generate it.")
        return

    agent_map = {node['id']: node for node in graph['nodes']}
    visited = set()
    history = [] # To store the simulation log
    
    # 2. THE SPARK: Programmatically pick starting nodes
    # We can pick random nodes or target influencers like TX-002 (James Martinez)
    all_agent_ids = [n['id'] for n in graph['nodes']]
    seeds = random.sample(all_agent_ids, num_seeds)
    
    spark_news = (os.getenv("SIMULATION_STIMULUS") or "").strip()
    if not spark_news:
        print("❌ Error: set SIMULATION_STIMULUS before running this script.")
        return

    # Initialize BFS queue: (target_agent, message_content, current_depth)
    queue = [(agent_id, spark_news, 0) for agent_id in seeds]
    
    print(f"🚀 Simulation started with {len(graph['nodes'])} agents.")
    print(f"🔥 Seeds: {', '.join(seeds)}\n")

    # 3. BFS EXECUTION LOOP
    while queue:
        # Group the current depth level to process in parallel
        current_depth = queue[0][2]
        if current_depth >= max_depth:
            print(f"🛑 Reached max depth of {max_depth}. Stopping.")
            break

        layer = [item for item in queue if item[2] == current_depth]
        queue = [item for item in queue if item[2] > current_depth]
        
        tasks = []
        agent_ids = []

        print(f"--- Depth {current_depth}: Processing {len(layer)} agents in parallel ---")

        for agent_id, message, _ in layer:
            if agent_id not in visited:
                visited.add(agent_id)
                agent = agent_map[agent_id]
                tasks.append(call_agent_llm(agent_id, agent['metadata']['system_prompt'], message))
                agent_ids.append(agent_id)

        # Utilize the 10 warm A100 containers simultaneously
        responses = await asyncio.gather(*tasks)

        for i, response in enumerate(responses):
            sender_id = agent_ids[i]
            print(f"🗨️ {sender_id} reacted to the news...")
            
            history.append({"from": sender_id, "depth": current_depth, "content": response})

            # Propagate the agent's reaction to their neighbors
            neighbors = agent_map[sender_id]['connections']
            for neighbor_id in neighbors:
                if neighbor_id not in visited:
                    queue.append((neighbor_id, response, current_depth + 1))

    # 4. Save results
    with open("simulation_log.json", "w") as f:
        json.dump(history, f, indent=2)
    print("\n✅ Simulation complete. Log saved to simulation_log.json")

if __name__ == "__main__":
    asyncio.run(run_simulation())

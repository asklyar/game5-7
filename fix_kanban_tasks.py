#!/usr/bin/env python3

import os
import re
from datetime import datetime

# Create directory if it doesn't exist
os.makedirs('kanban/tasks', exist_ok=True)

# Read the requirements file
with open('pokemath-requirements.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all PM tickets
ticket_pattern = r'## (PM-\d+)\s+·\s+(.+?)\n\n(.*?)(?=\n## PM-\d+|\Z)'
tickets = re.findall(ticket_pattern, content, re.DOTALL)

print(f"Found {len(tickets)} tickets")

# Generate task files for each ticket
for i, (ticket_id, title, details) in enumerate(tickets, 1):
    # Create a clean filename
    filename = f"{i:03d}-{ticket_id.lower().replace(' ', '-')}.md"

    # Extract dependencies and effort
    effort_match = re.search(r'Effort:\s+(.)', details)
    effort = effort_match.group(1) if effort_match else 'M'

    depends_match = re.search(r'Depends on:\s+(.+?)\n', details)
    depends = depends_match.group(1).strip() if depends_match else 'none'

    # Extract stage
    stage_match = re.search(r'Stage:\s+(\d)', details)
    stage = stage_match.group(1) if stage_match else '0'

    # Extract files new and files touched
    files_new_match = re.search(r'Files new:(.*?)(?=\n- |$)', details, re.DOTALL)
    files_new = files_new_match.group(1).strip() if files_new_match else "To be determined"

    files_touched_match = re.search(r'Files touched:(.*?)(?=\n- |$)', details, re.DOTALL)
    files_touched = files_touched_match.group(1).strip() if files_touched_match else "To be determined"

    # Generate date without timezone for simplicity (like the existing files)
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
    # Add timezone suffix for kanban-md compatibility
    now_with_tz = f"{now}Z"

    # Create task content with full requirements details
    task_content = f"""---
id: {i}
title: {ticket_id} · {title}
status: backlog
priority: medium
created: {now_with_tz}
updated: {now_with_tz}
tags:
    - PM-{ticket_id.split('-')[1]}
    - stage-{stage}
    - effort-{effort}
    - depends-on-{depends.replace(',', '').replace(' ', '-').lower() if depends != 'none' else 'none'}
---

{title}

**Ticket ID:** {ticket_id}
**Stage:** {stage} · **Wave:** 1 (based on requirements)
**Depends on:** {depends}
**Effort:** {effort}
**Risk:** low/medium/high (to be determined)

## Requirements:
{details}

## Files to create:
{files_new}

## Files to touch:
{files_touched}

## Acceptance criteria:
(To be filled in during implementation)
"""

    # Write the task file
    with open(f'kanban/tasks/{filename}', 'w', encoding='utf-8') as f:
        f.write(task_content)

print(f"Updated {len(tickets)} task files in kanban/tasks/")
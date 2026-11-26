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

    # Generate date without timezone for simplicity (like the existing files)
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
    # Add timezone suffix for kanban-md compatibility
    now_with_tz = f"{now}Z"

    # Create task content - using simple format that matches existing files
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

## Requirements Summary:
- [ ] Implement all requirements in the ticket
- [ ] Add tests for new functionality
- [ ] Update STATUS.md with any changes
- [ ] Run `python3 run_tests.py` to ensure everything works
- [ ] Run `python3 build.py --check` to verify build process
- [ ] Follow Definition of Done (see requirements section 0.2.6)

## Files to create:
{(details.split('Files new:')[1].split(chr(10))[0] if 'Files new:' in details else 'To be determined')}

## Acceptance criteria:
(To be filled in during implementation)
"""

    # Write the task file
    with open(f'kanban/tasks/{filename}', 'w', encoding='utf-8') as f:
        f.write(task_content)

print(f"Created {len(tickets)} task files in kanban/tasks/")
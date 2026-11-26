# Pokemon Math Project Manager Skill

This skill manages the Pokemon Math project using the Kanban board system. It creates and updates tasks based on the requirements document, moves them through the workflow, and ensures proper tracking of all work.

## How to use:

1. Create all initial tickets from pokemath-requirements.md in the backlog
2. Implement features following the Kanban workflow (backlog → todo → in-progress → review → done)
3. Move tickets between columns as work progresses
4. Update task status and comments with progress information
5. Always check the board before starting new work

## Project Structure:

The project uses a modular structure with:
- src/ directory for source code
- build.py and run_tests.py for building and testing
- kanban/ directory for task tracking  
- index.html as the main game file
- autotest.py for automated testing

## Kanban Columns:

1. backlog - New features to implement
2. todo - Ready to start work
3. in-progress - Currently being worked on
4. review - Work completed, ready for review
5. done - Completed and verified
6. archived - Completed but not needed anymore

## Implementation Notes:

- All new files should be added to git repository using `git add` 
- When implementing a ticket, move it to "in-progress"
- After completion, move to "review" 
- Once reviewed and tested, move to "done"
- Always update the task comments with progress information
- Follow the dependency graph in the requirements document when planning work
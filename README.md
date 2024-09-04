# Home World: A Text-Based Game Environment for Reinforcement Learning

## Introduction

Welcome to the **Home World** project, a text-based game environment designed for experimenting with reinforcement learning algorithms. This project has been an exciting journey, where I focused on learning control policies for text-based games. In this environment, interactions between players and the virtual world are exclusively through text, making it a fascinating challenge for reinforcement learning.

## Project Overview

The **Home World** environment mimics the structure of a typical house with a few rooms, each containing representative objects that players can interact with, such as an **apple** in the kitchen. The player's goal is to complete various quests.

This environment is represented by the tuple `<H, C, P, R, Ψ>`, where:

- `H` represents all possible game states.
- `C` represents all commands (action-object pairs) available to the player.
- `P` is the transition matrix, defining the probabilities of reaching a new state after taking a command.
- `R` is the deterministic reward function that assigns rewards based on the player's actions.
- `Ψ` is the function mapping the hidden game state to the observable text description that the player sees.

At the beginning of each episode, the player is placed in a random room and provided with a randomly selected quest. An example of a quest given to the player in text is "You are hungry now." To complete this quest, the player has to navigate through the house to reach the kitchen and eat the apple (i.e., type in the command `eat apple`). In this game, the room is hidden from the player, who only receives a description of the underlying room.

The underlying game state is given by `h = (r, q)`, where `r` is the index of the room and `q` is the index of the quest. At each step, the text description provided to the player contains two parts `s = (sr, sq)`, where `sr` is the room description (which are varied and randomly provided) and `sq` is the quest description. The player receives a positive reward for completing a quest and negative rewards for invalid commands (e.g., `eat TV`). Each non-terminating step incurs a small deterministic negative reward, which incentivizes the player to learn policies that solve quests in fewer steps. (see Table)

An episode ends when the player finishes the quest or has taken more steps than a fixed maximum number of steps.


## The Tasks

This project was divided into several key tasks, each of which presented its own unique challenges and learning opportunities:

1. **Tabular Q-learning Implementation**:
   - I implemented the tabular Q-learning algorithm for a simple setting where each text description is associated with a unique index.

2. **Q-learning with Linear Approximation**:
   - I extended the Q-learning algorithm using a linear approximation architecture with a bag-of-words representation for the textual state description.

3. **Deep Q-Network (DQN) Implementation**:
   - I implemented a deep Q-network to handle the complexity of the Home World environment.

4. **Applying Q-learning Algorithms**:
   - Finally, I applied the Q-learning algorithms to the Home World game and analyzed the performance.

## Implementation Details

The project is structured around three main files:

- `agent_tabular_ql.py`: This script contains the implementation of the tabular Q-learning algorithm.
- `agent_linear.py`: Here, I've implemented the Q-learning algorithm with linear approximation using a bag-of-words model for text representations.
- `agent_dqn.py`: This script includes the implementation of the deep Q-network, leveraging PyTorch to build and train the neural network.
- `framework.py`: This script includes the implementation of The Home World Game itself.
- `utils.py`: This script includes the helper function for the game and reinforcement learning implementation.
- `game.tsv`: This script includes the description text for rooms and quest in game.


## Results and Analysis

In this section, I provide an overview of the results obtained from applying the different Q-learning algorithms to the Home World environment. The following aspects are discussed:

- **Performance Comparison**:
  - A comparison of the performance of the tabular Q-learning, linear approximation Q-learning, and deep Q-network. This includes metrics such as convergence rate, reward accumulation, and the number of steps required to complete quests.

- **Visualizations**:
  - Graphs and plots illustrating the performance of each algorithm. This may include learning curves, reward distributions, and any other relevant visualizations.

- **Insights**:
  - Key observations and insights derived from the results. This may include the strengths and weaknesses of each approach, and how the different algorithms handled the text-based environment.


## Setup Instructions

To get started with this project, you will need the following dependencies:

- **Python 3.8**
- **NumPy 1.24.3** for numerical operations
- **matplotlib 3.7.2** for plotting
- **PyTorch 2.2.0** for neural network implementation
- **tqdm 4.66.4** for progress bars

### Installation

You can install the required libraries using pip and the `requirements.txt` file:

```bash
pip install -r requirements.txt
```


## Conclusion

Working on the Home World project was a rewarding experience, as it allowed me to explore various reinforcement learning algorithms in a unique, text-based environment. This project not only enhanced my understanding of reinforcement learning but also provided practical insights into implementing these algorithms in different settings.

Feel free to explore the code, experiment with the environment, and share your feedback or improvements. Happy coding!

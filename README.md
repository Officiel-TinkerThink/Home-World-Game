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

<p align="center">
  <img src="/images/Game%20&%20Reward%20Rule.png" alt="Game and Reward Rule">
</p>
<p align="center">
  <strong>Figure 1. Game Rule and Reward Table</strong>
</p>


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

### Hyperparameter Value Influence on Model Performance

<p align="center">
  <img src="/images/Tabular%20Q-Learning%20with%20HyperParameter%20alpha_equal_to_1.png" alt="Alpha = 1" width="300" height="200" style="display:inline-block; margin:10px;">
  <img src="/images/Tabular%20Q-Learning%20with%20HyperParameter%20alpha_equal_to_1e-1.png" alt="Alpha = 1e-1" width="300" height="200" style="display:inline-block; margin:10px;">
  <img src="/images/Tabular%20Q-Learning%20with%20HyperParameter%20alpha_equal_to_1e-2.png" alt="Alpha = 1e-2" width="300" height="200" style="display:inline-block; margin:10px;">
</p>
<p align="center">
  <img src="/images/Tabular%20Q-Learning%20with%20HyperParameter%20alpha_equal_to_1e-4.png" alt="Alpha = 1e-4" width="300" height="200" style="display:inline-block; margin:10px;">
  <img src="/images/Tabular%20Q-Learning%20with%20HyperParameter%20alpha_equal_to_1e-5.png" alt="Alpha = 1e-5" width="300" height="200" style="display:inline-block; margin:10px;">
  <img src="/images/Tabular%20Q-Learning%20with%20HyperParameter%20alpha_equal_to_1e-6.png" alt="Alpha = 1e-6" width="300" height="200" style="display:inline-block; margin:10px;">
</p>
<p align="center">
  <strong>Figure 2. Hyperparameter Tuning of Alpha from 1 to 1e-6 Consecutively</strong>
</p>

#### Effects of Alpha (α)

- **Exploration Parameter ε**: Fixed at 0.5.
- **Range of α**: Experiments are conducted with different values of α in the range [10⁻⁸, 1].
- **Convergence**: The algorithm does not converge for all values of α in less than 200 epochs.
- **Convergence Rate**: The smaller the α, the slower the convergence.

<p align="center">
  <img src="/images/Tabular%20Q-Learning%20with%20HyperParameter%20epsilon_equal_to_1e-5.png" alt="Epsilon = 1e-5" width="300" height="200" style="display:inline-block; margin:10px;">
  <img src="/images/Tabular%20Q-Learning%20with%20HyperParameter%20epsilon_equal_to_1.png" alt="Epsilon = 1" width="300" height="200" style="display:inline-block; margin:10px;">
</p>

<p align="center">
  <strong>Figure 3. Hyperparameter Tuning of Epsilon = 1e-5 and Epsilon = 1</strong>
</p>


#### Effects of Adjusting Epsilon (ε)

- **For very large ε (e.g., ε = 1)**: The algorithm converges slower compared to ε = 0.5.
- **For very small ε (e.g., ε = 0.00001)**: The algorithm converges faster compared to ε = 0.5.

### Analysis of Model Performance for Three Different Architectures

#### Optimal Expected Reward
- The optimal expected reward for each episode is **0.55375**.

#### Performance of Different Architectures

1. **Tabular Q-Learning**
   - **Performance**: Very good, with an expected reward > 0.50 after convergence.
   - **Limitations**: While effective in this simple game, tabular Q-learning may not scale well to more complex environments due to the explosion of state-action pairs.

2. **Q-Learning with Linear Approximation**
   - **Performance**: The worst, with an expected reward < 0.43 after convergence.
   - **Challenges**: The linear approximation struggles with the representation and generalization of state-action pairs, leading to suboptimal performance in this scenario.

3. **Deep Q-Network (DQN)**
   - **Performance**: Very good, with an expected reward > 0.50 after convergence.
   - **Advantages**: DQN leverages neural networks to approximate the Q-value function, handling complex state spaces and actions effectively.

#### Text-to-Vector Representation

Given that the state displayed to the agent is described in text, a mechanism for mapping text descriptions into vector representations is crucial. Two common approaches are:

1. **Naive Indexing**:
   - **Description**: Assigning a unique index to each text description.
   - **Limitation**: Becomes infeasible when the state space is large, as it does not scale well with increasing complexity.

2. **Vector Representation Generator**:
   - **Description**: A more sophisticated approach involves designing a representation generator \( \psi_R(\cdot) \) that converts text descriptions into vector representations \( v_s = \psi_R(s) \). A popular method is using a bag-of-words model to represent textual descriptions.

#### Approximating Q-Values

In large-scale games, maintaining Q-values for all possible state-action pairs is often impractical. To address this, we approximate \( Q(s, c) \) using a parameterized function:

\[ Q(s, c; \theta) = \phi(s, c)^T \theta = \sum_{i=1}^{d} \phi_i(s, c) \theta_i \]

where:
- \( \phi(s, c) \) is a fixed feature vector in \( \mathbb{R}^d \) for state-action pair \( (s, c) \).
- \( \theta \in \mathbb{R}^d \) is a parameter vector shared across state-action pairs.
- The challenge is to design the feature vectors \( \phi(s, c) \) effectively.

For DQN, the architecture differs significantly:
- **Neural Network Representation**: Instead of using a parameterized function with \( \theta \), DQN utilizes neural networks to directly approximate the Q-value function. The network learns to represent state-action pairs and their values through its layers, eliminating the need for manually designed feature vectors.


### Insight

- These observations suggest that the convergence of the Q-learning algorithm is sensitive to both the exploration parameter ε and the learning rate α. Proper tuning of these parameters is crucial for efficient learning and convergence of the algorithm.
- These observations highlight the importance of choosing the right architecture and representation mechanism for effective reinforcement learning. While tabular Q-learning works well for simple environments, more complex scenarios benefit from linear approximations or deep neural networks that handle large state spaces and intricate representations more effectively.



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

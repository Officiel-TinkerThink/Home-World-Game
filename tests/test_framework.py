"""Tests for the Python environment and the tabular agent's update.  Run with:  python -m unittest discover tests"""
import os
import random
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import framework  # noqa: E402
import utils  # noqa: E402

framework.load_game_data()


class Environment(unittest.TestCase):
    def test_state_index_dictionaries(self):
        rooms, quests = framework.make_all_states_index()
        self.assertEqual(len(rooms), 16)
        self.assertEqual(len(quests), 4)

    def test_rewards(self):
        room_desc = framework.rooms_desc["Kitchen"][0]
        quest = "You are hungry."
        framework.STEP_COUNT = 0
        # invalid command in the kitchen: eat bed
        _, _, reward, terminal = framework.step_game(room_desc, quest, framework.actions.index("eat"), framework.objects.index("bed"))
        self.assertAlmostEqual(reward, -0.11)
        self.assertFalse(terminal)
        # finish the quest
        _, _, reward, terminal = framework.step_game(room_desc, quest, framework.actions.index("eat"), framework.objects.index("apple"))
        self.assertEqual(reward, 1)
        self.assertTrue(terminal)

    def test_transitions(self):
        framework.STEP_COUNT = 0
        next_desc, _, reward, _ = framework.step_game(framework.rooms_desc["Kitchen"][1], "You are bored.", framework.actions.index("go"), framework.objects.index("north"))
        self.assertAlmostEqual(reward, -0.01)
        self.assertEqual(framework.rooms_desc_map[next_desc], framework.rooms.index("Garden"))

    def test_episode_ends_after_max_steps(self):
        framework.STEP_COUNT = 0
        desc, quest, _ = framework.newGame()
        terminal = False
        for _ in range(framework.MAX_STEPS):
            desc, quest, _, terminal = framework.step_game(desc, quest, framework.actions.index("eat"), framework.objects.index("north"))
        self.assertTrue(terminal)


class Features(unittest.TestCase):
    def test_bag_of_words(self):
        self.assertEqual(utils.extract_words("You are hungry."), ["you", "are", "hungry", "."])
        d = utils.bag_of_words([["You are hungry."], ["You are bored."]])
        v = utils.extract_bow_feature_vector("You are hungry. You are bored.", d)
        self.assertEqual(v[d["you"]], 2)


class TabularAgent(unittest.TestCase):
    def test_update_rule(self):
        import agent_tabular_ql as tab
        tab.ALPHA = 0.5
        q = np.zeros((16, 4, 5, 8))
        tab.tabular_q_learning(q, 0, 0, 1, 1, 1.0, 0, 0, True)
        self.assertAlmostEqual(q[0, 0, 1, 1], 0.5)
        tab.tabular_q_learning(q, 0, 0, 1, 1, 1.0, 0, 0, True)
        self.assertAlmostEqual(q[0, 0, 1, 1], 0.75)

    def test_epsilon_greedy_is_greedy_when_epsilon_zero(self):
        import agent_tabular_ql as tab
        q = np.zeros((16, 4, 5, 8))
        q[3, 2, 4, 7] = 1.0
        self.assertEqual(tuple(tab.epsilon_greedy(3, 2, q, 0.0)), (4, 7))


if __name__ == "__main__":
    unittest.main()

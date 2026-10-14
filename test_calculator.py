#!/usr/bin/env python3
"""
CivicQueue Queuing Engine & M/M/c Calculator - Python Unit Test Suite
Corresponds with the JavaScript implementation.
"""

import math
import unittest

DEFAULT_ALPHA = 0.25
DEFAULT_SERVICE_DURATION_SEC = 120
DEFAULT_MU = 1.0 / DEFAULT_SERVICE_DURATION_SEC


def calculate_ewma(current_mu=DEFAULT_MU, recent_duration_sec=120.0, alpha=DEFAULT_ALPHA):
    """
    mu_t = alpha * mu_recent + (1 - alpha) * mu_{t-1}
    """
    if recent_duration_sec <= 0:
        return current_mu
    sanitized_duration = max(5.0, float(recent_duration_sec))
    mu_recent = 1.0 / sanitized_duration
    return alpha * mu_recent + (1.0 - alpha) * current_mu


def calculate_aggregate_wait_sec(position, active_mus, default_duration_sec=DEFAULT_SERVICE_DURATION_SEC):
    """
    Estimated Wait = p / sum(mu_i)
    """
    if position <= 0:
        return {
            "est_wait_sec": 0,
            "total_service_rate_per_sec": 0.0,
            "active_counters": len(active_mus),
            "is_counters_paused": len(active_mus) == 0,
        }

    valid_mus = [mu for mu in active_mus if mu > 0]
    total_rate = sum(valid_mus)

    if not valid_mus or total_rate <= 0:
        return {
            "est_wait_sec": round(position * default_duration_sec),
            "total_service_rate_per_sec": 0.0,
            "active_counters": 0,
            "is_counters_paused": True,
        }

    est_wait = round(position / total_rate)
    return {
        "est_wait_sec": max(10, est_wait),
        "total_service_rate_per_sec": total_rate,
        "active_counters": len(valid_mus),
        "is_counters_paused": False,
    }


def calculate_erlang_c(c, lambda_rate, mu_rate):
    """
    Erlang-C formula for M/M/c queue
    """
    if c <= 0 or mu_rate <= 0 or lambda_rate <= 0:
        return {"erlang_c_probability": 0.0, "theoretical_wait_sec": 0, "utilization": 0.0}

    r = lambda_rate / mu_rate
    rho = r / float(c)

    if rho >= 1.0:
        return {"erlang_c_probability": 1.0, "theoretical_wait_sec": 9999, "utilization": rho}

    sum_k = sum((r ** k) / math.factorial(k) for k in range(c))
    term_c = ((r ** c) / math.factorial(c)) * (1.0 / (1.0 - rho))
    p_w = term_c / (sum_k + term_c)
    theoretical_wait = p_w / (c * mu_rate - lambda_rate)

    return {
        "erlang_c_probability": min(1.0, max(0.0, p_w)),
        "theoretical_wait_sec": round(theoretical_wait),
        "utilization": round(rho, 3),
    }


class TestQueuingCalculator(unittest.TestCase):
    def test_ewma_faster_service(self):
        initial_mu = 1.0 / 120.0
        recent_duration = 60.0
        expected = 0.25 * (1.0 / 60.0) + 0.75 * initial_mu
        actual = calculate_ewma(initial_mu, recent_duration, 0.25)
        self.assertAlmostEqual(actual, expected, places=6)
        self.assertLess(1.0 / actual, 120.0, "Avg duration should drop with fast customer")

    def test_ewma_slower_service(self):
        initial_mu = 1.0 / 90.0
        recent_duration = 180.0
        expected = 0.25 * (1.0 / 180.0) + 0.75 * initial_mu
        actual = calculate_ewma(initial_mu, recent_duration, 0.25)
        self.assertAlmostEqual(actual, expected, places=6)
        self.assertGreater(1.0 / actual, 90.0, "Avg duration should increase with slow customer")

    def test_aggregate_wait_two_counters(self):
        # 2 counters each 120s -> sum(mu) = 1/60
        active_mus = [1.0 / 120.0, 1.0 / 120.0]
        position = 3
        # Expected = 3 / (1/60) = 180 seconds
        res = calculate_aggregate_wait_sec(position, active_mus)
        self.assertEqual(res["est_wait_sec"], 180)
        self.assertEqual(res["active_counters"], 2)
        self.assertFalse(res["is_counters_paused"])

    def test_aggregate_wait_all_counters_closed(self):
        res = calculate_aggregate_wait_sec(4, [], default_duration_sec=120)
        self.assertTrue(res["is_counters_paused"])
        self.assertEqual(res["active_counters"], 0)
        self.assertEqual(res["est_wait_sec"], 480)

    def test_erlang_c(self):
        c = 2
        lambda_rate = 0.01
        mu_rate = 0.01
        res = calculate_erlang_c(c, lambda_rate, mu_rate)
        self.assertEqual(res["utilization"], 0.5)
        self.assertGreater(res["erlang_c_probability"], 0.0)
        self.assertLess(res["erlang_c_probability"], 1.0)
        self.assertGreater(res["theoretical_wait_sec"], 0)


if __name__ == "__main__":
    unittest.main()

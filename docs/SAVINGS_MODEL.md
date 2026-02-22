# Savings Model — Mathematical Explanation

This document describes the mathematics used to estimate cost savings from automated incident remediation (the "AegisOps" approach). It defines variables, derives formulas for expected savings per incident, and shows how to aggregate savings over time. Simple numeric examples and sensitivity analysis are included.

---

## Notation and Variables

- $C_{inst}$ : cost per instance per hour (USD / hour)
- $N$ : number of instances affected by an incident (integer)
- $T_{baseline}$ : mean time to resolve the incident manually (hours)
- $T_{auto}$ : mean time to resolve the incident using automation (hours)
- $\Delta T = T_{baseline} - T_{auto}$ : time saved per incident (hours)
- $P_{s}$ : probability (success rate) that the automated remediation is correct (0..1)
- $C_{action}$ : fixed cost of performing the automated action (USD). Examples: operator overhead, short downtime cost due to action itself.
- $C_{fp}$ : cost when automation acts incorrectly (false positive/incorrect remediation) (USD)
- $C_{down}$ : business-impact cost per hour of downtime per instance (USD / hour) — optional when counting business losses
- $\lambda$ : incident arrival rate (incidents per day)

All time variables are expressed in hours. You can convert minutes to hours by dividing by 60.

---

## Core Formulas

### 1) Resource-cost savings per incident
The direct resource-cost savings from reducing instance runtime (compute cost) is:
$$
S_{resource} = P_{s} \times (\Delta T) \times N \times C_{inst}
$$

This multiplies the per-instance time saved by the hourly instance cost and the probability the automation actually succeeds.

### 2) Business-availability savings per incident (optional)
If you wish to quantify business impact (lost revenue or cost of outage), use $C_{down}$:
$$
S_{availability} = P_{s} \times (\Delta T) \times N \times C_{down}
$$

### 3) Expected cost of incorrect action (penalty)
When automation fails or performs an incorrect remediation, there is an expected penalty:
$$
E_{penalty} = (1 - P_{s}) \times C_{fp} + C_{action}
$$

Note: $C_{action}$ is included as a fixed cost (you can also model it multiplied by $P_{s}$ if you only pay the action cost when automation executes successfully — choose the model that fits your accounting).

### 4) Net expected savings per incident
Combining the above, the net expected savings per incident is:
$$
S_{incident} = S_{resource} + S_{availability} - E_{penalty}
$$
Substituting gives:
$$
S_{incident} = P_{s} (\Delta T) N (C_{inst} + C_{down}) - \big[(1 - P_{s}) C_{fp} + C_{action}\big]
$$

If you are only modeling compute costs (no business downtime), omit $C_{down}$.

### 5) Expected savings over time
If incidents arrive at rate $\lambda$ (incidents per day), expected daily savings:
$$
S_{daily} = \lambda \times S_{incident}
$$
Annualized (assuming 365 days):
$$
S_{annual} = 365 \times S_{daily}
$$

### 6) Breakeven success probability
To find the minimal $P_{s}$ that yields non-negative expected savings ($S_{incident} \ge 0$), solve for $P_{s}$:
\\begin{align*
P_{s} (\Delta T) N (C_{inst} + C_{down}) &\\ge (1 - P_{s}) C_{fp} + C_{action} \\
P_{s} \\big[ (\Delta T) N (C_{inst} + C_{down}) + C_{fp} \\big] &\\ge C_{fp} + C_{action} \\
P_{s} &\\ge \\dfrac{C_{fp} + C_{action}}{(\Delta T) N (C_{inst} + C_{down}) + C_{fp}}
\\end{align*

This threshold tells you how accurate automation must be to produce positive expected savings.

---

## Examples

### Example A — Compute-only, conservative numbers
- $C_{inst} = 0.50$ USD/hour
- $N = 1$
- $T_{baseline} = 0.5$ hour (30 minutes)
- $T_{auto} = 0.02$ hour (1.2 minutes)
- $\Delta T = 0.48$ hour
- $P_{s} = 0.90$
- $C_{action} = 0$ (action itself negligible)
- $C_{fp} = 1.00$ USD (small penalty for a bad automated restart)

Compute savings per incident:
$$
S_{resource} = 0.9 \times 0.48 \times 1 \times 0.5 = 0.216\\ \text{USD}
$$
Penalty expected:
$$
E_{penalty} = 0.1 \times 1.0 + 0 = 0.1\\ \text{USD}
$$
Net savings per incident:
$$
S_{incident} = 0.216 - 0.1 = 0.116\\ \text{USD}
$$
If $\lambda = 10$ incidents/day, daily savings $\\approx 1.16$ USD, annual $\\approx 424$ USD.

### Example B — Include business downtime cost (higher impact)
- Same as above but $C_{down} = 100$ USD/hour (significant business impact)

Then the availability savings term is large:
$$
S_{availability} = 0.9 \times 0.48 \times 1 \times 100 = 43.2\\ \text{USD}
$$
Total net per incident (approx):
$$
S_{incident} \\approx 43.2 + 0.216 - 0.1 = 43.316\\ \text{USD}
$$
At $\lambda=1$ incident/day, annual savings exceed $15{,}800$ USD.

---

## Sensitivity & Risk Considerations

- False positives (high $C_{fp}$) can easily negate small compute savings — ensure $P_{s}$ and $C_{fp}$ are well understood.
- Automation is most valuable when $C_{down}$ is large (high business impact) or $\Delta T$ is large.
- Improving $P_{s}$ (better models, runbook checks, council voting) increases savings linearly in $P_{s}$.
- Reducing $T_{auto}$ (faster remediation) also directly increases $\Delta T$ and thus savings.

### Conservative deployment strategy
- Use a hybrid model: require council approval when $P_{s}$ is below threshold.
- Simulate and log each action to estimate empirical $P_{s}$ and $C_{fp}$ before enabling full automation.

---

## Quick Checklist for Applying the Model

1. Measure real-world values for $T_{baseline}$ and $T_{auto}$ (minutes or hours).
2. Estimate $C_{inst}$ and $C_{down}$ for your infrastructure.
3. Measure or estimate $P_{s}$ using past incident outcomes and offline validation.
4. Choose conservative $C_{fp}$ and $C_{action}$ values to account for worst-case penalties.
5. Compute $S_{incident}$ and scale by observed $\lambda$ to get daily/annual figures.

---

If you want, I can also:
- Add a small Python script that computes these numbers for arbitrary inputs, or
- Add a CSV template for collecting empirical values (T_baseline, T_auto, P_s, etc.)

Created: 2026-02-22

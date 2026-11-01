#!/usr/bin/env python3
"""Independent arithmetic checks for selected university-science questions.

Inputs and equations below were transcribed from the reviewed question prompts,
not imported from the curriculum generators. This is a bounded numerical check,
not proof of the correctness of every concept or textbook passage.
"""
from pathlib import Path
from decimal import Decimal, ROUND_HALF_EVEN
import json
import math
import re

ROOT = Path(__file__).resolve().parents[1]
questions = {}
for subject in ('uphysics', 'uchemistry'):
    for q in json.loads((ROOT / 'data' / (subject + '-questions.json')).read_text()):
        questions[q['id']] = q
records = []


def canonical(text):
    return re.sub(r'\s+', '', str(text)).replace('−', '-').replace('－', '-')


def scientific(value, with_mantissa=True):
    exponent = math.floor(math.log10(abs(value)))
    superscript = str(exponent).translate(str.maketrans('-0123456789', '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'))
    mantissa = value / 10 ** exponent
    if not with_mantissa:
        assert math.isclose(mantissa, 1), value
    return (f'{mantissa:.1f}×' if with_mantissa else '') + '10' + superscript


def case(qid, formula, given, value, display, prompt_terms=()):
    q = questions[qid]
    for term in prompt_terms:
        assert term in q['prompt'], (qid, 'prompt changed; recheck inputs', term)
    expected = display(value)
    actual = next(c['text'] for c in q['choices'] if c['key'] == q['answer'])
    assert canonical(expected) == canonical(actual), (qid, expected, actual)
    records.append({'question_id': qid, 'formula': formula, 'given': given,
                    'calculated_value': value, 'expected_choice_text': expected,
                    'actual_correct_choice_text': actual, 'result': 'PASS'})


case('uch_structure_001_q2', 'V=nRT/p', {'n_mol': 1, 'R_kPa_L_mol_K': 8.314, 'T_K': 300, 'p_kPa': 100},
     1 * 8.314 * 300 / 100, lambda x: f'{x:.1f} L', ('300 K', '100 kPa'))
case('uch_structure_002_q2', 'p_O2=n_O2/(n_N2+n_O2) * p_total', {'N2_mol': 2, 'O2_mol': 1, 'p_kPa': 150},
     1 / (2 + 1) * 150, lambda x: f'{x:.0f} kPa', ('150 kPa',))
case('uch_structure_003_q2', 'Vm_real/Vm_ideal=Z', {'Z': .80}, .80,
     lambda x: f'为理想值的{x:.2f}倍', ('0.80',))
case('uch_structure_012_q1', 'formal_charge=valence-nonbonding-bonding/2',
     {'valence_electrons': 5, 'nonbonding_electrons': 0, 'single_bonds': 4}, 5 - 0 - 8 / 2,
     lambda x: f'{x:+.0f}', ('4条单键',))
case('uch_structure_016_q1', 'bond_order=(bonding-antibonding)/2', {'bonding': 8, 'antibonding': 4},
     (8 - 4) / 2, lambda x: f'{x:.0f}', ('8个成键电子', '4个反键电子'))
case('uch_structure_020_q1', 'N_FCC=8/8+6/2', {'corners': 8, 'faces': 6}, 8 / 8 + 6 / 2,
     lambda x: f'{x:.0f}', ('8个顶点', '6个面心'))
case('uch_structure_020_q2', 'N_BCC=8/8+1', {'corners': 8, 'body_centers': 1}, 8 / 8 + 1,
     lambda x: f'{x:.0f}', ('体心',))
case('uch_structure_021_q2', 'd=n*lambda/(2*sin(theta))', {'order': 1, 'lambda_nm': .150, 'theta_deg': 30},
     .150 / (2 * math.sin(math.radians(30))), lambda x: f'{x:.3f} nm', ('0.150 nm', '30°'))
case('uch_thermodynamics_002_q2', 'delta_U=Q+W_on=500-200', {'Q_J': 500, 'W_by_J': 200}, 500 - 200,
     lambda x: f'{x:+.0f} J', ('500 J', '200 J'))
case('uch_thermodynamics_003_q2', 'W_on=-p_ext*(V2-V1); 1 kPa L=1 J', {'p_kPa': 100, 'V1_L': 2, 'V2_L': 5},
     -100 * (5 - 2), lambda x: f'{x:.0f} J', ('100 kPa', '2 L', '5 L'))
case('uch_thermodynamics_004_q2', 'Cp,m=Cv,m+R', {'Cv_m': 20.8, 'R': 8.31}, 20.8 + 8.31,
     lambda x: f'{x:.1f} J·mol⁻¹·K⁻¹', ('20.8', '8.31'))
case('uch_thermodynamics_006_q2', 'delta_H_AC=delta_H_AB+delta_H_BC', {'AB_kJ_mol': 20, 'BC_kJ_mol': -50},
     20 - 50, lambda x: f'{x:.0f} kJ·mol⁻¹', ('+20', '−50'))
case('uch_thermodynamics_007_q2', 'delta(delta_H)=delta_Cp*(T2-T1)/1000', {'dCp_J_mol_K': 20, 'T1_K': 300, 'T2_K': 400},
     20 * (400 - 300) / 1000, lambda x: f'{x:.1f} kJ·mol⁻¹', ('300 K', '400 K'))
case('uch_thermodynamics_009_q2', 'delta_S=Q_rev/T', {'Q_rev_J': 600, 'T_K': 300}, 600 / 300,
     lambda x: f'{x:+.1f} J·K⁻¹', ('300 K', '600 J'))
case('uch_thermodynamics_010_q2', 'delta_S_total=delta_S_system+delta_S_surroundings', {'system_J_K': -3, 'surroundings_J_K': 5},
     -3 + 5, lambda x: f'{x:+.0f} J·K⁻¹', ('−3', '+5'))
case('uch_thermodynamics_012_q2', 'A=U-T*S/1000', {'U_kJ': 10, 'T_K': 300, 'S_J_K': 20}, 10 - 300 * 20 / 1000,
     lambda x: f'{x:.0f} kJ', ('10 kJ', '300 K', '20 J'))
case('uch_thermodynamics_014_q2', 'V=sum(n_i*partial_molar_volume_i)', {'n_A': 1, 'n_B': 2, 'Vbar_A_mL_mol': 20, 'Vbar_B_mL_mol': 30},
     1 * 20 + 2 * 30, lambda x: f'{x:.0f} mL', ('1 mol', '2 mol'))
case('uch_thermodynamics_015_q2', 'a=gamma*c/c_standard', {'gamma': .8, 'c_mol_L': .1, 'c_standard_mol_L': 1},
     .8 * .1 / 1, lambda x: f'{x:.3f}', ('0.80', '0.10'))
case('uch_thermodynamics_016_q2', 'Q=a_B^2/a_A', {'a_A': .5, 'a_B': .2}, .2 ** 2 / .5,
     lambda x: f'{x:.3f}', ('0.50', '0.20'))
case('uch_thermodynamics_018_q1', 'K_reverse=1/K_forward', {'K_forward': 4}, 1 / 4,
     lambda x: f'{x:.2f}', ('K=4',))
case('uch_thermodynamics_018_q2', 'K_half_stoichiometry=sqrt(K)', {'K': 9}, math.sqrt(9),
     lambda x: f'{x:.0f}', ('K=9',))
case('uch_thermodynamics_023_q2', 'p=k_H*x', {'k_H_kPa': 200, 'x': .010}, 200 * .010,
     lambda x: f'{x:.1f} kPa', ('200 kPa', '0.010'))
case('uch_thermodynamics_024_q2', 'fraction_rich=(z-x_lean)/(x_rich-x_lean)', {'z': .35, 'x_lean': .20, 'x_rich': .80},
     (.35 - .20) / (.80 - .20), lambda x: f'{100*x:.0f}%', ('0.20', '0.80', '0.35'))

case('uch_kinetics_001_q2', 'v_B=(-dc_A/dt)/2', {'A_consumption_mol_L_s': .040}, .040 / 2,
     lambda x: f'{x:.3f} mol·L⁻¹·s⁻¹', ('2A→B', '0.040'))
case('uch_kinetics_005_q2', 't_half=c0/(2*k)', {'c0_mol_L': .20, 'k_mol_L_s': .010}, .20 / (2 * .010),
     lambda x: f'{x:.0f} s', ('0.20', '0.010'))
case('uch_kinetics_006_q2', 'fraction=2^(-t/t_half)', {'t_min': 30, 'half_life_min': 10}, 2 ** (-30 / 10),
     lambda x: f'1/{1/x:.0f}', ('10 min', '30 min'))
case('uch_kinetics_007_q2', 't_half=1/(k*c0)', {'k_L_mol_s': .50, 'c0_mol_L': .20}, 1 / (.50 * .20),
     lambda x: f'{x:.0f} s', ('0.50', '0.20'))
case('uch_kinetics_010_q2', 'reverse_barrier=E_peak-E_product', {'peak_kJ_mol': 50, 'product_kJ_mol': -20},
     50 - (-20), lambda x: f'{x:.0f} kJ·mol⁻¹', ('−20', '+50'))
case('uch_kinetics_015_q2', 'theta=Kp/(1+Kp)', {'Kp': 3}, 3 / (1 + 3), lambda x: f'{x:.2f}', ('Kp=3',))
case('uch_kinetics_016_q2', 'W_surface=gamma*delta_A', {'gamma_J_m2': .050, 'delta_A_m2': .020},
     .050 * .020, lambda x: f'{x:.4f} J', ('0.050', '0.020', '单个'))
case('uch_solution_001_q2', 'b=n_solute/m_solvent', {'n_mol': .10, 'm_solvent_kg': .50}, .10 / .50,
     lambda x: f'{x:.2f} mol·kg⁻¹', ('0.10 mol', '0.50 kg'))
case('uch_solution_002_q2', 'I_c=(c_Ca*2^2+c_Cl*(-1)^2)/2', {'c_Ca': .010, 'c_Cl': .020},
     (.010 * 2 ** 2 + .020 * (-1) ** 2) / 2, lambda x: f'{x:.3f} mol·L⁻¹', ('CaCl₂', '0.010'))
case('uch_solution_003_q2', 'p_A=x_A*p_A_star', {'x_A': .90, 'p_star_kPa': 20}, .90 * 20,
     lambda x: f'{x:.1f} kPa', ('20.0 kPa', '0.90'))
case('uch_solution_004_q2', 'delta_T_f=i*K_f*b', {'i': 1, 'K_f_K_kg_mol': 1.86, 'b_mol_kg': .10},
     1 * 1.86 * .10, lambda x: f'{x:.3f} K', ('非电解质', '0.10', '1.86'))
case('uch_solution_005_q2', 'Pi=c*R*T', {'c_mol_L': .010, 'R_kPa_L_mol_K': 8.314, 'T_K': 300},
     .010 * 8.314 * 300, lambda x: f'{x:.1f} kPa', ('0.010', '300 K', '8.314'))
case('uch_solution_007_q2', 'K_b=K_w/K_a', {'K_w': 1e-14, 'K_a': 1e-5}, 1e-14 / 1e-5,
     lambda x: scientific(x), ('10⁻¹⁴', '10⁻⁵'))
case('uch_solution_008_q2', 'pH_neutral=pK_w/2 in stated dilute model', {'pK_w': 13.0}, 13.0 / 2,
     lambda x: f'{x:.1f}', ('13.0',))
case('uch_solution_009_q2', 'pH=-log10(sqrt(K_a*c0/c_standard))', {'K_a': 1e-5, 'c0': .10, 'c_standard': 1},
     -math.log10(math.sqrt(1e-5 * .10)), lambda x: f'{x:.1f}', ('0.10', '10⁻⁵'))
case('uch_solution_010_q2', 'pH=pK_w+log10(sqrt(K_b*c0/c_standard))', {'pK_w': 14, 'K_b': 1e-5, 'c0': .10},
     14 + math.log10(math.sqrt(1e-5 * .10)), lambda x: f'{x:.1f}', ('14.0', '0.10', '10⁻⁵'))
case('uch_solution_011_q2', 'a_A/a_HA=10^(pH-pK_a2)', {'pH_minus_pK_a2': 1}, 10 ** 1,
     lambda x: f'{x:.0f}', ('pK_a2+1',))
case('uch_solution_012_q2', 'pH=pK_a+log10(base/acid)', {'pK_a': 4.76, 'base_acid_ratio': 10}, 4.76 + math.log10(10),
     lambda x: f'{x:.2f}', ('4.76', '=10'))
case('uch_solution_015_q2', 'fraction_A=ratio/(1+ratio)', {'ratio': 9}, 9 / (1 + 9),
     lambda x: f'{x*100:.0f}%', ('=9',))
case('uch_solution_020_q2', 'beta2=K1*K2', {'K1': 1e4, 'K2': 1e3}, 1e4 * 1e3,
     lambda x: scientific(x, False), ('10⁴', '10³'))
case('uch_solution_021_q2', 'K_conditional=K_f*alpha_L', {'K_f': 1e8, 'alpha_L': 1e-3}, 1e8 * 1e-3,
     lambda x: scientific(x, False), ('10⁸', '10⁻³'))
case('uch_electrochemistry_005_q2', 'E=E_standard-(0.05916/n)*log10(Q)', {'E_standard_V': 1.10, 'n': 2, 'Q': 100},
     1.10 - .05916 / 2 * math.log10(100), lambda x: f'{x:.2f} V', ('1.10 V', 'n=2', 'Q=100'))
case('uch_electrochemistry_006_q2', 'delta_rG=-n*F*E/1000', {'n': 2, 'F_C_mol': 96485, 'E_V': .500},
     -2 * 96485 * .500 / 1000, lambda x: f'{x:.1f} kJ·mol⁻¹', ('n=2', '0.500 V', '96485'))
case('uch_electrochemistry_007_q2', 'K=10^(n*E_standard/0.05916)', {'n': 1, 'E_standard_V': .05916},
     10 ** (1 * .05916 / .05916), lambda x: f'{x:.0f}', ('n=1', '0.05916 V'))
case('uch_electrochemistry_008_q2', 'E=0.05916/2*log10(activity_ratio)', {'n': 2, 'activity_ratio': 100},
     .05916 / 2 * math.log10(100), lambda x: f'{x:.4f} V', ('M/M²⁺', '=100'))
case('uch_electrochemistry_010_q2', 'n_product=Q/(z*F)', {'Q_C': 1930, 'z': 2, 'F_C_mol': 96500},
     1930 / (2 * 96500), lambda x: f'{x:.4f} mol', ('1930 C', '96500', '100%'))
case('uch_electrochemistry_011_q2', 'current_efficiency=actual/theoretical', {'actual_mol': .016, 'theoretical_mol': .020},
     .016 / .020, lambda x: f'{x*100:.0f}%', ('0.020 mol', '0.016 mol'))
case('uch_electrochemistry_012_q2', 'kappa=G*cell_constant', {'G_S': .020, 'cell_constant_m_inverse': 100},
     .020 * 100, lambda x: f'{x:.1f} S·m⁻¹', ('100 m⁻¹', '0.020 S'))
case('uch_electrochemistry_014_q2', 't_anion=1-t_cation', {'t_cation': .40}, 1 - .40,
     lambda x: f'{x:.2f}', ('两种', '0.40'))
case('uch_electrochemistry_016_q2', 'U_work=U_rev+overpotential_losses+ohmic_drop', {'U_rev': 1.2, 'overpotentials': .3, 'ohmic_drop': .2},
     1.2 + .3 + .2, lambda x: f'{x:.1f} V', ('1.2 V', '0.3 V', '0.2 V'))
case('uch_electrochemistry_018_q2', 'energy_Wh=mean_voltage_V*capacity_Ah', {'mean_V': 3, 'capacity_Ah': 2},
     3 * 2, lambda x: f'{x:.1f} Wh', ('2.0 Ah', '3.0 V'))

case('uch_analysis_004_q2', 'relative_error=(x-x_ref)/x_ref', {'x': 10.2, 'reference': 10.0}, (10.2 - 10.0) / 10.0,
     lambda x: f'{100*x:+.1f}%', ('10.2', '10.0'))
case('uch_analysis_005_q1', 'sum rounded to tenths; retain guard digits until final report', {'a': '12.11', 'b': '0.3'},
     float((Decimal('12.11') + Decimal('0.3')).quantize(Decimal('0.1'), rounding=ROUND_HALF_EVEN)),
     lambda x: f'{x:.1f}', ('12.11+0.3',))
case('uch_analysis_005_q2', 'product rounded to two significant figures', {'a': '2.5', 'b': '3.42'},
     float((Decimal('2.5') * Decimal('3.42')).quantize(Decimal('0.1'), rounding=ROUND_HALF_EVEN)),
     lambda x: f'{x:.1f}', ('2.5×3.42',))
sample_values = [1, 2, 3]
sample_mean = sum(sample_values) / len(sample_values)
sample_sd = math.sqrt(sum((v - sample_mean) ** 2 for v in sample_values) / (len(sample_values) - 1))
case('uch_analysis_006_q2', 'mean=sum(x)/n; s=sqrt(sum((x-mean)^2)/(n-1))', {'values_mg_L': sample_values},
     [sample_mean, sample_sd], lambda x: f'{x[0]:.0f}和{x[1]:.0f} mg·L⁻¹', ('1、2、3', 'n−1'))
case('uch_analysis_007_q2', 'confidence_interval_half_width=t*s/sqrt(n)', {'t': 3.18, 's_mg_L': 2, 'n': 4},
     3.18 * 2 / math.sqrt(4), lambda x: f'{x:.2f} mg·L⁻¹', ('s=2.0', 'n=4', '3.18'))
case('uch_analysis_009_q2', 'c=(S-intercept)/slope', {'S': .50, 'intercept': .10, 'slope': 2.0},
     (.50 - .10) / 2, lambda x: f'{x:.2f}', ('0.10+2.0c', '0.50'))
case('uch_analysis_010_q2', 'original_c=S0*added_c/(S1-S0)', {'S0': 20, 'S1': 40, 'added_c_mg_L': 2},
     20 * 2 / (40 - 20), lambda x: f'{x:.1f} mg·L⁻¹', ('信号20', '2.0 mg', '信号40'))
case('uch_analysis_011_q2', 'response_ratio=(2*S_analyte)/(2*S_internal_standard)', {'analyte': 50, 'internal_standard': 100, 'scale': 2},
     (2 * 50) / (2 * 100), lambda x: f'仍为{x:.2f}', ('信号50', '100', '2倍'))
case('uch_analysis_012_q2', 'LOD=3*sigma_blank/slope as defined by prompt', {'sigma_blank': .002, 'slope': .050},
     3 * .002 / .050, lambda x: f'{x:.2f} mg·L⁻¹', ('0.002', '0.050', 'LOD=3'))
case('uch_analysis_015_q2', 'n_metal_mmol=c_EDTA_mol_L*V_EDTA_L*1000 for 1:1 reaction', {'c_mol_L': .0100, 'volume_mL': 25},
     .0100 * (25 / 1000) * 1000, lambda x: f'{x:.3f} mmol', ('1∶1', '0.0100', '25.00 mL'))
common_electrons = math.lcm(2, 5)
case('uch_analysis_016_q2', 'n_A:n_B=(lcm(2,5)/2):(lcm(2,5)/5)', {'electrons_lost_A': 2, 'electrons_gained_B': 5},
     [common_electrons // 2, common_electrons // 5], lambda x: f'{x[0]}∶{x[1]}', ('2个电子', '5个电子'))
case('uch_analysis_018_q2', 'A=epsilon*b*c', {'epsilon_L_mol_cm': 4000, 'b_cm': 1, 'c_mol_L': 2e-5},
     4000 * 1 * 2e-5, lambda x: f'{x:.3f}', ('4000', '1.00 cm', '2.0×10⁻⁵'))
case('uch_analysis_019_q1', 'A=-log10(percent_T/100)', {'percent_T': 10}, -math.log10(10 / 100),
     lambda x: f'{x:.1f}', ('10%',))
case('uch_analysis_019_q2', 'percent_T=100*10^(-A)', {'A_initial': 1, 'A_final': 2},
     [100 * 10 ** (-1), 100 * 10 ** (-2)], lambda x: f'由{x[0]:.0f}%降至{x[1]:.0f}%', ('从1增至2',))
case('uch_analysis_023_q2', 'ion_mass_Da=(m/z)*charge_number', {'m_over_z': 100, 'z': 2}, 100 * 2,
     lambda x: f'{x:.0f} Da', ('m/z=100', 'z=2'))
case('uch_analysis_024_q2', 'k=(t_R-t_M)/t_M', {'t_R_min': 5, 't_M_min': 1}, (5 - 1) / 1,
     lambda x: f'{x:.1f}', ('5.0 min', '1.0 min'))
case('uch_analysis_025_q2', 'R_s=2*(t_R2-t_R1)/(w1+w2)', {'t_R1': 5, 't_R2': 6, 'w1': .50, 'w2': .50},
     2 * (6 - 5) / (.50 + .50), lambda x: f'{x:.1f}', ('5.0和6.0', '0.50 min'))
case('uch_analysis_027_q1', 'delta_ppm=frequency_difference_Hz/spectrometer_frequency_Hz*1e6', {'difference_Hz': 600, 'frequency_MHz': 200},
     600 / (200 * 1e6) * 1e6, lambda x: f'{x:.1f} ppm', ('200 MHz', '600 Hz'))
case('uch_analysis_028_q2', 'E_B=h_nu-E_k-phi under stated energy-reference convention', {'h_nu_eV': 1486.6, 'E_k_eV': 1000, 'phi_eV': 4.6},
     1486.6 - 1000 - 4.6, lambda x: f'{x:.1f} eV', ('1486.6 eV', '1000.0 eV', '4.6 eV'))

report = {'date': '2026-10-31', 'subject': 'uchemistry', 'reviewer': '/root', 'result': 'PASS',
          'numerical_cases': len(records), 'cases': records,
          'limitations': ['仅复算列出的题目与给定模型；其余概念和题目由独立内容复核覆盖。',
                          '不调用作者生成器，不以题库原答案反推计算结果；格式变化会要求复看题干和答案。']}
(ROOT / 'validation' / 'university-independent-calculations.json').write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'result': 'PASS', 'numerical_cases': len(records)}, ensure_ascii=False))

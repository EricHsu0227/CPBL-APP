export const KIND = { regular: '例行賽', challenge: '季後挑戰賽', taiwan: '台灣大賽' };
export const RESULT = {
  '1B': '一壘安打', '2B': '二壘安打', '3B': '三壘安打', HR: '全壘打', IHR: '場內全壘打', SO: '三振', uBB: '四壞球', IBB: '故意四壞', HBP: '觸身球',
  GO: '滾地出局', FO: '飛球出局', FC: '野手選擇', E: '失誤上壘', SH: '犧牲觸擊', SF: '高飛犧牲打', GIDP: '滾地雙殺', DP: '雙殺打', TP: '三殺打',
  IH: '妨礙打擊', IR: '妨礙跑壘', ID: '妨礙守備', SH_E: '犧牲觸擊（失誤）', SH_FC: '犧牲觸擊（野選）', SF_E: '高飛犧牲（失誤）', GIDP_E: '雙殺（失誤）',
};
export const TRAJ = { G: '滾地', L: '平飛', F: '高飛', P: '內野飛' };
export const HARD = { S: '弱', M: '中', H: '強' };
export const PITCH = { FF: '四縫線', SI: '伸卡/二縫', FC: '卡特', KN: '蝴蝶球', SL: '滑球', CU: '曲球', CH: '變速球', FO: '指叉球', FS: '快速指叉', EP: '小便球' };
export const PITCH_COLOR = { FF: '#d22d49', SI: '#fe9d00', FC: '#933f2c', SL: '#c3bd0e', CU: '#00d1ed', CH: '#1dbe3a', FO: '#3bacac', FS: '#3bacac', KN: '#867a08', EP: '#888' };
export const BASES = ['無人', '一壘', '二壘', '一二壘', '三壘', '一三壘', '二三壘', '滿壘'];
export const isHit = (r) => ['1B', '2B', '3B', 'HR', 'IHR'].includes(r);
export const date = (s) => s?.slice(0, 10);
export const wd = (s) => '日一二三四五六'[new Date(s.slice(0, 10) + 'T12:00:00').getDay()];
export const time = (s) => s?.slice(11, 16);
export const rate = (v) => (v == null ? '—' : v.toFixed(3).replace(/^0\./, '.'));

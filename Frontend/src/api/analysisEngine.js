/**
 * PRISM Local Static Analysis Engine
 * Client-side static vulnerability analyzer for Solidity source.
 * Processes contracts entirely locally with zero external data transmission.
 */

export function analyzeSoliditySource(sourceCode, fileName = 'Contract.sol') {
  if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
    return {
      success: false,
      error: 'Empty or invalid Solidity source code provided.',
      findings: [],
      stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0, riskScore: 0 }
    };
  }

  const lines = sourceCode.split('\n');
  const findings = [];

  // Detector 1: Reentrancy (external call followed by state modification)
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // Check for low-level call or transfer
    if (line.includes('.call{value:') || line.includes('.call.value(') || (line.includes('.call(') && line.includes('value'))) {
      // Look ahead up to 10 lines for state mutations (e.g. balances[...] =, balance =, _balances)
      let foundMutation = false;
      let mutationLine = lineNum;
      for (let j = idx + 1; j < Math.min(lines.length, idx + 12); j++) {
        const nextLine = lines[j];
        if (nextLine.includes('balances[') || nextLine.includes('balance[') || nextLine.includes('totalShares') || nextLine.includes('state =') || (nextLine.includes('=') && !nextLine.includes('==') && !nextLine.includes('bool '))) {
          foundMutation = true;
          mutationLine = j + 1;
          break;
        }
      }

      if (foundMutation) {
        findings.push({
          id: `PRISM-DET-01-${lineNum}`,
          detector: 'PRISM-DET-01',
          category: 'Reentrancy',
          title: 'State Variable Update After External Call',
          severity: 'Critical',
          contract: fileName.replace('.sol', ''),
          file: fileName,
          lineStart: lineNum,
          lineEnd: mutationLine,
          description: 'A low-level call transfers execution control to an external recipient before contract state variables are updated.',
          whyItMatters: 'An attacker can register a malicious fallback/receive function that re-enters this contract before state balances are zeroed out, enabling complete drain of contract funds.',
          remediation: 'Apply the Checks-Effects-Interactions pattern: update state balances before initiating external transfers, or apply OpenZeppelin ReentrancyGuard nonReentrant modifier.',
          codeSnippet: lines.slice(Math.max(0, lineNum - 2), Math.min(lines.length, mutationLine + 2)).join('\n')
        });
      }
    }
  });

  // Detector 2: Unchecked External Call Return Value
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if ((line.includes('.call(') || line.includes('.call{') || line.includes('.send(')) && !line.includes('require(') && !line.includes('if (') && !line.includes('bool success')) {
      findings.push({
        id: `PRISM-DET-02-${lineNum}`,
        detector: 'PRISM-DET-02',
        category: 'Unchecked Calls',
        title: 'Unchecked Low-Level External Call Return Value',
        severity: 'High',
        contract: fileName.replace('.sol', ''),
        file: fileName,
        lineStart: lineNum,
        lineEnd: lineNum,
        description: 'Low-level call return value is not captured or verified with require().',
        whyItMatters: 'If the external contract reverts or runs out of gas, execution will continue silently, causing accounting inconsistencies or locked funds.',
        remediation: 'Capture the boolean return value and verify execution status: (bool success, ) = target.call(...); require(success, "Call failed");',
        codeSnippet: lines.slice(Math.max(0, lineNum - 2), Math.min(lines.length, lineNum + 2)).join('\n')
      });
    }
  });

  // Detector 3: Oracle Stale Data / Chainlink without validation
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes('latestRoundData()')) {
      // Check surrounding 15 lines for timestamp / updatedAt validation
      let hasValidation = false;
      for (let j = Math.max(0, idx - 5); j < Math.min(lines.length, idx + 15); j++) {
        if (lines[j].includes('updatedAt') && (lines[j].includes('block.timestamp') || lines[j].includes('require('))) {
          hasValidation = true;
          break;
        }
      }

      if (!hasValidation) {
        findings.push({
          id: `PRISM-DET-03-${lineNum}`,
          detector: 'PRISM-DET-03',
          category: 'Oracle Dependency',
          title: 'Missing Stale Price Validation in Chainlink Oracle Feed',
          severity: 'High',
          contract: fileName.replace('.sol', ''),
          file: fileName,
          lineStart: lineNum,
          lineEnd: lineNum + 4,
          description: 'latestRoundData() is called without validating updatedAt timestamp, answeredInRound, or positive answer.',
          whyItMatters: 'If an oracle sequencer halts or network congestion prevents price updates, stale or zero prices may be consumed, enabling catastrophic under-collateralized borrowing or incorrect liquidations.',
          remediation: 'Require that answer > 0, block.timestamp - updatedAt <= HEARTBEAT_INTERVAL, and answeredInRound >= roundId.',
          codeSnippet: lines.slice(Math.max(0, lineNum - 1), Math.min(lines.length, lineNum + 6)).join('\n')
        });
      }
    }
  });

  // Detector 4: Authorization via tx.origin
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes('tx.origin')) {
      findings.push({
        id: `PRISM-DET-04-${lineNum}`,
        detector: 'PRISM-DET-04',
        category: 'Access Control',
        title: 'Authentication via Vulnerable tx.origin',
        severity: 'Medium',
        contract: fileName.replace('.sol', ''),
        file: fileName,
        lineStart: lineNum,
        lineEnd: lineNum,
        description: 'Authentication or access check uses tx.origin instead of msg.sender.',
        whyItMatters: 'Contracts relying on tx.origin for authorization are susceptible to phishing attacks where an authorized user is tricked into calling a malicious intermediary contract.',
        remediation: 'Use msg.sender for sender verification and access control enforcement.',
        codeSnippet: lines.slice(Math.max(0, lineNum - 2), Math.min(lines.length, lineNum + 2)).join('\n')
      });
    }
  });

  // Detector 5: Integer Precision Loss (Division Before Multiplication)
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const match = line.match(/\/\s*([a-zA-Z0-9_]+)\s*\*/);
    if (match && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      findings.push({
        id: `PRISM-DET-05-${lineNum}`,
        detector: 'PRISM-DET-05',
        category: 'Integer / Precision',
        title: 'Division Before Multiplication Precision Loss',
        severity: 'Medium',
        contract: fileName.replace('.sol', ''),
        file: fileName,
        lineStart: lineNum,
        lineEnd: lineNum,
        description: 'Arithmetic division executed prior to multiplication in integer operations.',
        whyItMatters: 'Solidity integer arithmetic truncates remainders towards zero. Performing division before multiplication amplifies precision loss and can result in zero valuations.',
        remediation: 'Perform all multiplication operations before division, using appropriate high-precision scaling factors (e.g. 1e18).',
        codeSnippet: lines.slice(Math.max(0, lineNum - 2), Math.min(lines.length, lineNum + 2)).join('\n')
      });
    }
  });

  // Detector 6: Arbitrary delegatecall
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes('.delegatecall(') && !line.trim().startsWith('//')) {
      findings.push({
        id: `PRISM-DET-06-${lineNum}`,
        detector: 'PRISM-DET-06',
        category: 'Access Control',
        title: 'Potential Unrestricted Delegatecall Target',
        severity: 'Critical',
        contract: fileName.replace('.sol', ''),
        file: fileName,
        lineStart: lineNum,
        lineEnd: lineNum,
        description: 'Low-level delegatecall instruction detected. Delegatecall executes arbitrary logic in the storage context of this contract.',
        whyItMatters: 'If the target address or data payload can be influenced by an unauthorized caller, state variables can be overwritten and contract ownership hijacked.',
        remediation: 'Strictly restrict delegatecall targets to verified immutable implementation addresses.',
        codeSnippet: lines.slice(Math.max(0, lineNum - 2), Math.min(lines.length, lineNum + 2)).join('\n')
      });
    }
  });

  // Detector 7: Selfdestruct / Suicide instruction
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if ((line.includes('selfdestruct(') || line.includes('suicide(')) && !line.trim().startsWith('//')) {
      findings.push({
        id: `PRISM-DET-07-${lineNum}`,
        detector: 'PRISM-DET-07',
        category: 'Access Control',
        title: 'Selfdestruct Instruction Present',
        severity: 'High',
        contract: fileName.replace('.sol', ''),
        file: fileName,
        lineStart: lineNum,
        lineEnd: lineNum,
        description: 'selfdestruct instruction destroys bytecode and forcibly sends contract Ether balance to a target.',
        whyItMatters: 'Deprecated in post-Cancun EVM and represents a single point of failure if access control is breached.',
        remediation: 'Remove selfdestruct. Replace with an administrative pause mechanism if emergency shutdown is needed.',
        codeSnippet: lines.slice(Math.max(0, lineNum - 2), Math.min(lines.length, lineNum + 2)).join('\n')
      });
    }
  });

  const critical = findings.filter(f => f.severity === 'Critical').length;
  const high = findings.filter(f => f.severity === 'High').length;
  const medium = findings.filter(f => f.severity === 'Medium').length;
  const low = findings.filter(f => f.severity === 'Low').length;

  // Calculate weighted risk contribution (0 to 100)
  const weightedScore = Math.min(100, (critical * 35) + (high * 20) + (medium * 8) + (low * 3));

  return {
    success: true,
    findings,
    stats: {
      total: findings.length,
      critical,
      high,
      medium,
      low,
      riskScore: weightedScore
    }
  };
}

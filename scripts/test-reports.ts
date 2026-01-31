import 'dotenv/config';
import {
    getComplianceMetrics,
    getFinancialMetrics,
    getTrendMetrics,
    getWorkflowMetrics
} from '../src/lib/reports';

async function main() {
    console.log('--- Testing Compliance Metrics ---');
    const compliance = await getComplianceMetrics();
    console.log(JSON.stringify(compliance, null, 2));

    console.log('\n--- Testing Financial Metrics ---');
    const financial = await getFinancialMetrics();
    console.log(JSON.stringify(financial, null, 2));

    console.log('\n--- Testing Trend Metrics ---');
    const trends = await getTrendMetrics();
    console.log(JSON.stringify(trends, null, 2));

    console.log('\n--- Testing Workflow Metrics ---');
    const workflow = await getWorkflowMetrics();
    console.log(JSON.stringify(workflow, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });

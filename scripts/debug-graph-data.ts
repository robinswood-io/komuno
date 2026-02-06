import { chromium } from 'playwright';

async function debugGraphData() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    // Login
    await page.goto('https://cjd80.rbw.ovh/login');
    await page.fill('input[type="email"]', 'admin@test.local');
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    // Navigate to Relations
    await page.goto('https://cjd80.rbw.ovh/admin/members/member-graph', {
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    });

    await page.waitForTimeout(5000);

    // Inspecter les données du graphe dans la page
    const graphData = await page.evaluate(() => {
      // Chercher dans le window object ou dans les composants React
      const reactRoot = document.querySelector('#__next');

      // Essayer de trouver les props du composant via React DevTools fiber
      const findReactProps = (element: any): any => {
        for (const key in element) {
          if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
            const fiber = element[key];
            if (fiber && fiber.memoizedProps) {
              return fiber.memoizedProps;
            }
          }
        }
        return null;
      };

      // Chercher le canvas et remonter au parent pour trouver les props
      const canvas = document.querySelector('canvas');
      let currentElement = canvas?.parentElement;
      let attempts = 0;

      while (currentElement && attempts < 10) {
        const props = findReactProps(currentElement);
        if (props?.nodes || props?.edges) {
          return {
            nodes: props.nodes || [],
            edges: props.edges || [],
          };
        }
        currentElement = currentElement.parentElement;
        attempts++;
      }

      return { nodes: [], edges: [], error: 'Props not found' };
    });

    console.log('\n=== DONNÉES DU GRAPHE ===');
    console.log('Nombre de nœuds:', graphData.nodes?.length || 0);
    console.log('Nombre d\'arêtes:', graphData.edges?.length || 0);

    if (graphData.nodes && graphData.nodes.length > 0) {
      console.log('\n=== NŒUDS ===');
      graphData.nodes.forEach((node: any, idx: number) => {
        console.log(`[${idx}] ID: ${node.id}, Label: ${node.label}, Size: ${node.size}, Fill: ${node.fill}`);
      });
    }

    if (graphData.edges && graphData.edges.length > 0) {
      console.log('\n=== ARÊTES ===');
      graphData.edges.forEach((edge: any, idx: number) => {
        console.log(`[${idx}] ${edge.source} → ${edge.target} (${edge.label || 'no label'})`);
      });
    }

    // Aussi récupérer les données via les API calls
    const apiResponses = await page.evaluate(async () => {
      try {
        const membersRes = await fetch('/api/admin/members?limit=1000');
        const members = await membersRes.json();

        const relationsRes = await fetch('/api/admin/relations');
        const relations = await relationsRes.json();

        return {
          members: members.data || [],
          relations: relations.data || [],
        };
      } catch (error) {
        return { error: String(error) };
      }
    });

    console.log('\n=== DONNÉES API ===');
    console.log('Membres total:', apiResponses.members?.length || 0);
    console.log('Relations total:', apiResponses.relations?.length || 0);

    if (apiResponses.relations && apiResponses.relations.length > 0) {
      console.log('\n=== RELATIONS API ===');
      apiResponses.relations.forEach((rel: any, idx: number) => {
        console.log(`[${idx}] ${rel.memberEmail} → ${rel.relatedMemberEmail} (${rel.relationType})`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await browser.close();
  }
}

debugGraphData();

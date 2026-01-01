import { Plugin } from 'unified';
import { Root, Element, ElementContent } from 'hast';

/**
 * Plugin de Rehype para transformar headers en estructura para Radix Accordion.
 * Output structure:
 * <accordion-root>
 *   <accordion-item value="ITEM_ID">
 *     <accordion-header>Title</accordion-header>
 *     <accordion-content>
 *       ...content...
 *       <accordion-root> (nested for H3s)
 *         <accordion-item value="SUB_ITEM_ID">
 *           ...
 *         </accordion-item>
 *       </accordion-root>
 *     </accordion-content>
 *   </accordion-item>
 * </accordion-root>
 */
export const rehypeCollapsible: Plugin<[], Root> = () => {
    return (tree: Root) => {
        // Helper para generar IDs únicos simples
        const generateId = (prefix: string, index: number) => `${prefix} -${index} `;

        // Helper para crear elementos custom
        const createCustomElement = (tagName: string, children: ElementContent[], properties: any = {}): Element => ({
            type: 'element',
            tagName,
            properties,
            children
        });

        /**
         * Procesa una lista de nodos y agrupa contenido bajo headers de un nivel específico.
         * Retorna una lista de nodos donde los headers y su contenido han sido envueltos en items.
         */
        const groupNodesByHeader = (nodes: ElementContent[], headerTag: 'h2' | 'h3'): ElementContent[] => {
            const newNodes: ElementContent[] = [];
            let currentItemContent: ElementContent[] = [];
            let currentHeader: Element | null = null;
            let itemIndex = 0;

            const flushCurrentItem = () => {
                if (!currentHeader) return;

                // Si es H2, procesar recursivamente el contenido para buscar H3s
                let processedContent = currentItemContent;
                if (headerTag === 'h2') {
                    processedContent = groupNodesByHeader(currentItemContent, 'h3');
                }

                // Crear el item
                const item = createCustomElement('accordion-item', [
                    createCustomElement('accordion-header', currentHeader.children, {
                        className: `summary - ${headerTag} `
                    }),
                    createCustomElement('accordion-content', processedContent)
                ], {
                    value: generateId(headerTag, itemIndex++),
                    className: `details - ${headerTag} `
                });

                newNodes.push(item);
                currentItemContent = [];
                currentHeader = null;
            };

            for (const node of nodes) {
                // Ignorar doctype o comentarios en la lógica de agrupación
                if (node.type !== 'element') {
                    if (currentHeader) {
                        currentItemContent.push(node);
                    } else {
                        newNodes.push(node);
                    }
                    continue;
                }

                if (node.tagName === headerTag) {
                    flushCurrentItem();
                    currentHeader = node;
                    continue;
                }

                if (headerTag === 'h2' && node.tagName === 'h2') {
                    // Caso imposible dado el if anterior, pero por claridad explicita
                    flushCurrentItem();
                    currentHeader = node;
                    continue;
                }

                // Si tenemos un header abierto, acumulamos contenido
                if (currentHeader) {
                    currentItemContent.push(node);
                } else {
                    // Si no hay header abierto, el nodo se queda tal cual (ej: intro text)
                    newNodes.push(node);
                }
            }

            flushCurrentItem();

            // Post-procesamiento: Agrupar secuencias de accordion-item en accordion-root
            return groupItemsIntoRoots(newNodes);
        };

        /**
         * Busca secuencias de 'accordion-item' y las envuelve en 'accordion-root'.
         */
        const groupItemsIntoRoots = (nodes: ElementContent[]): ElementContent[] => {
            const finalNodes: ElementContent[] = [];
            let currentRootItems: ElementContent[] = [];

            const flushRoot = () => {
                if (currentRootItems.length > 0) {
                    finalNodes.push(createCustomElement('accordion-root', currentRootItems, {
                        type: 'single',
                        collapsible: true
                    }));
                    currentRootItems = [];
                }
            };

            for (const node of nodes) {
                if (node.type === 'element' && node.tagName === 'accordion-item') {
                    currentRootItems.push(node);
                } else {
                    flushRoot();
                    finalNodes.push(node);
                }
            }
            flushRoot();

            return finalNodes;
        };

        // Separar doctype del resto de contenido para evitar errores de tipo
        // RootContent puede incluir Doctype, pero ElementContent no.
        const doctype = tree.children.find(n => n.type === 'doctype');
        const content = tree.children.filter(n => n.type !== 'doctype') as ElementContent[];

        // Iniciar procesamiento desde el root buscando H2
        const processedContent = groupNodesByHeader(content, 'h2');

        // Reconstruir children (mantener doctype al inicio si existía)
        tree.children = doctype ? [doctype, ...processedContent] : processedContent;
    };
};

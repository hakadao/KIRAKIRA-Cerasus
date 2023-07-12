import path from "path";
import parser from "postcss-selector-parser";
import { VariableName } from "../../classes/VariableName";
import { arrayClearAll } from "../../utils/array";

const transformPseudo = (componentName: string) => (selectors => {
	selectors.walk(selector => {
		if (selector.type === "pseudo" && selector.value.match(/:comp(onent)?$/)) {
			if (selector.parent) {
				const oneElementNodes: parser.Node[] = [];
				const { nodes } = selector.parent;
				let isMatchPseudo = false, containsTag = false;
				for (const node of nodes) {
					if (node.type === "combinator")
						if (isMatchPseudo) break;
						else {
							arrayClearAll(oneElementNodes);
							containsTag = false;
							continue;
						}
					oneElementNodes.push(node);
					if (node === selector) isMatchPseudo = true;
					if (node.type === "tag") containsTag = true;
				}
				const firstNode = oneElementNodes[0];
				if (!containsTag && firstNode) {
					const index = nodes.indexOf(firstNode);
					nodes.splice(index, 0, parser.tag({ value: "kira-component" }));
				}
			}
			selector.replaceWith(parser.className({ value: componentName }));
		}
	});
}) as parser.SyncProcessor;

const componentRoot: PostCSSPlugin = (_opts = {}) => {
	return {
		postcssPlugin: "postcss-component-root",
		Rule(rule, _helper) {
			if (rule.selector.match(/:comp(onent)?(?![A-Za-z0-9\-_])/)) {
				const filePath = rule.source?.input.file;
				if (!filePath) return;
				let fileName: string | undefined = path.parse(filePath).name;
				if (fileName.includes("vue&type=style")) {
					// 若为 Vue 组件名，例如：TextBox.vue?vue&type=style&index=0&scoped=bf5e516a&lang.scss
					fileName = fileName.match(/\w+(?=\.vue)/i)?.[0];
					if (!fileName) return;
				}
				if (fileName.includes(".module")) {
					// 若为 CSS Module，例如：TextBox.module.css
					fileName = fileName.replaceAll(".module", "");
					if (!fileName) return;
				}
				const componentName = new VariableName(fileName).kebab;
				rule.selector = parser(transformPseudo(componentName)).processSync(rule.selector);
			}
		},
	};
};
componentRoot.postcss = true;

export default componentRoot;

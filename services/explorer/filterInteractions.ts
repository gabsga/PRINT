import { IntegratedInteraction } from '../../types';

interface FilterOptions {
  graphScope?: 'global' | 'direct' | 'cascade';
  goAnnotations?: Record<string, string[]>;
  minConfidence?: number;
  pathwayMapping?: Record<string, string[]>;
  priorityTfFilter?: string | null;
  searchTerm?: string;
  selectedGoTerm?: string;
  selectedPathway?: string;
  selectedSources?: string[];
}

export function filterInteractions(
  data: IntegratedInteraction[],
  {
    graphScope = 'global',
    goAnnotations = {},
    minConfidence = 1,
    pathwayMapping = {},
    priorityTfFilter = null,
    searchTerm = '',
    selectedGoTerm = 'all',
    selectedPathway = 'all',
    selectedSources = ['TARGET', 'DAP', 'CHIP']
  }: FilterOptions
) {
  const normalizedSearch = searchTerm.trim().toUpperCase();
  const selectedGoGeneSet = selectedGoTerm === 'all'
    ? null
    : new Set((goAnnotations[selectedGoTerm] || []).map((gene) => gene.toUpperCase()));

  let output = data.filter((interaction) => {
    const matchesSearch = normalizedSearch === '' || [interaction.tf, interaction.target, interaction.tfId, interaction.targetId]
      .some((gene) => (gene || '').toUpperCase().includes(normalizedSearch));
    const matchesConfidence = interaction.evidenceCount >= minConfidence;

    let matchesPathway = true;
    if (selectedPathway !== 'all') {
      const tfProcesses = [
        ...(pathwayMapping[interaction.tf.toUpperCase()] || []),
        ...(pathwayMapping[(interaction.tfId || '').toUpperCase()] || [])
      ];
      const targetProcesses = [
        ...(pathwayMapping[interaction.target.toUpperCase()] || []),
        ...(pathwayMapping[(interaction.targetId || '').toUpperCase()] || [])
      ];
      matchesPathway = tfProcesses.includes(selectedPathway) || targetProcesses.includes(selectedPathway);
    }

    let matchesGo = true;
    if (selectedGoGeneSet) {
      matchesGo = [interaction.tf, interaction.target, interaction.tfId, interaction.targetId]
        .some((gene) => selectedGoGeneSet.has((gene || '').toUpperCase()));
    }

    const matchesTf = priorityTfFilter
      ? interaction.tf.toUpperCase() === priorityTfFilter
      : true;
    const matchesSource = interaction.sources.some((source) => selectedSources.includes(source));

    return matchesSearch && matchesConfidence && matchesPathway && matchesGo && matchesTf && matchesSource;
  });

  if (graphScope === 'global') {
    if (priorityTfFilter) {
      output = output.filter((interaction) => interaction.tf.toUpperCase() === priorityTfFilter);
    }
    return output;
  }

  const center = priorityTfFilter || (
    output.some((interaction) => interaction.tf.toUpperCase() === normalizedSearch)
      ? normalizedSearch
      : null
  );

  if (!center) return output;

  if (graphScope === 'direct') {
    return output.filter((interaction) => interaction.tf.toUpperCase() === center);
  }

  const level1 = output.filter((interaction) => interaction.tf.toUpperCase() === center);
  const level1Targets = new Set(level1.map((interaction) => interaction.target.toUpperCase()));
  const level2 = output.filter((interaction) => level1Targets.has(interaction.tf.toUpperCase()));
  return Array.from(new Set([...level1, ...level2]));
}

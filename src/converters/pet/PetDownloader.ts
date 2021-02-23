import { singleton } from 'tsyringe';
import { Configuration } from '../../common/config/Configuration';
import { HabboAssetSWF } from '../../swf/HabboAssetSWF';
import File from '../../utils/File';
import { FileUtilities } from '../../utils/FileUtilities';
import { Logger } from '../../utils/Logger';

@singleton()
export class PetDownloader
{
    constructor(
        private readonly _configuration: Configuration,
        private readonly _logger: Logger)
    {}

    public async download(directory: File, callback: (habboAssetSwf: HabboAssetSWF) => Promise<void>): Promise<void>
    {
        const petTypes = await this.parsePetTypes();

        if(!petTypes) throw new Error('invalid_pets');

        const classNames: string[] = [];

        for(const petType of petTypes)
        {
            const existingFile = new File(directory.path + '/' + petType + '.nitro');

            if(existingFile.exists()) continue;

            if(classNames.indexOf(petType) >= 0) continue;

            classNames.push(petType);

            try
            {
                await this.extractPet(petType, callback);
            }

            catch (error)
            {
                console.log();
                console.error(`Error parsing ${ petType }: ` + error.message);

                this._logger.logError(`Error parsing ${ petType }: ` + error.message);
            }
        }
    }

    public async parsePetTypes(): Promise<string[]>
    {
        const petTypes: string[] = [];

        const pets = this._configuration.getValue('pet.configuration');

        if(pets)
        {
            const types = pets.split(',');

            for(const type of types) petTypes.push(type);
        }

        return petTypes;
    }

    public async extractPet(className: string, callback: (habboAssetSwf: HabboAssetSWF) => Promise<void>): Promise<void>
    {
        let url = this._configuration.getValue('dynamic.download.pet.url');

        if(!url || !url.length) return;

        url = url.replace('%className%', className);

        const buffer = await FileUtilities.readFileAsBuffer(url);

        if(!buffer) return;

        const newHabboAssetSWF = new HabboAssetSWF(buffer);

        await newHabboAssetSWF.setupAsync();

        await callback(newHabboAssetSWF);
    }
}
